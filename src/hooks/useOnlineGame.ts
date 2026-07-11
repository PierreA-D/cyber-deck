import { useCallback, useEffect, useRef, useState } from 'react'
import { type GameState, type CardInstance, isSpellCard, TargetType } from '@cyber-deck/engine'
import { useAuth } from '../context/useAuth'
import { createSocket, type GameSocket, type GameIntent, type PlayerInfo } from '../lib/socket'
import type { GameDriver } from './gameDriver'

export type OnlinePhase =
  | 'connecting' // ouverture de la socket
  | 'idle'       // connecté, pas encore en file
  | 'queuing'    // demande de mise en file envoyée
  | 'waiting'    // en file, en attente d'un adversaire
  | 'in_game'    // partie en cours
  | 'ended'      // partie terminée
  | 'error'      // connexion refusée / échec

export interface OnlineControls {
  phase:    OnlinePhase
  opponent: PlayerInfo | null
  you:      PlayerInfo | null
  join:     () => void
  leave:    () => void
}

// Pilote de jeu « en ligne » : même contrat que useGameEngine, mais chaque
// action est envoyée au serveur autoritaire et l'état vient des snapshots reçus.
export function useOnlineGame(): GameDriver & OnlineControls {
  const { token } = useAuth()

  const [phase,    setPhase]    = useState<OnlinePhase>('connecting')
  const [game,     setGame]     = useState<GameState | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [opponent, setOpponent] = useState<PlayerInfo | null>(null)
  const [you,      setYou]      = useState<PlayerInfo | null>(null)
  const [pendingSpell, setPendingSpell] = useState<CardInstance | null>(null)

  const socketRef = useRef<GameSocket | null>(null)

  useEffect(() => {
    if (!token) return

    const socket = createSocket(token)
    socketRef.current = socket

    socket.on('connect', () => setPhase(prev => (prev === 'connecting' ? 'idle' : prev)))
    socket.on('connect_error', (e) => {
      setError(`Connexion impossible : ${e.message}`)
      setPhase('error')
    })
    socket.on('queue:waiting', () => setPhase('waiting'))
    socket.on('match:found', ({ you: mine, opponent: other }) => {
      setYou(mine)
      setOpponent(other)
      setError(null)
      setPhase('in_game')
    })
    socket.on('game:state', ({ state }) => setGame(state))
    socket.on('game:over', ({ state }) => { setGame(state); setPhase('ended') })
    socket.on('opponent:disconnected', () => setError('Adversaire déconnecté — attente de reconnexion…'))
    socket.on('opponent:reconnected', () => setError(null))
    socket.on('game:error', ({ message }) => setError(message))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const emit = useCallback((intent: GameIntent) => {
    socketRef.current?.emit('game:intent', intent)
  }, [])

  const join = useCallback(() => {
    setError(null)
    setGame(null)
    setPhase('queuing')
    socketRef.current?.emit('queue:join')
  }, [])

  const leave = useCallback(() => {
    socketRef.current?.emit('queue:leave')
    setPhase('idle')
  }, [])

  const playCard = useCallback((instanceId: string) => emit({ type: 'playCard', instanceId }), [emit])
  const swap     = useCallback(() => emit({ type: 'swap' }), [emit])
  const heal     = useCallback(
    (healerInstanceId: string, targetInstanceId: string) =>
      emit({ type: 'heal', healerId: healerInstanceId, targetId: targetInstanceId }),
    [emit],
  )
  const attack   = useCallback(
    (attackerInstanceId: string, targetInstanceId?: string) =>
      emit({ type: 'attack', attackerId: attackerInstanceId, targetId: targetInstanceId }),
    [emit],
  )
  const endTurn  = useCallback(() => emit({ type: 'endTurn' }), [emit])

  // Sort à cible manuelle : on arme la sélection côté client, puis on envoie
  // l'intention avec la cible. Sinon on envoie directement (résolution auto).
  const playSpell = useCallback((instanceId: string): boolean => {
    if (!game) return false
    const card = game.player.hand.find(c => c.instanceId === instanceId)
    if (!card || !isSpellCard(card) || !card.data.spellEffect) return false

    const effect = card.data.spellEffect
    if (effect.targetType === TargetType.SingleCard && effect.targetMode === 'manual') {
      setPendingSpell(card)
      return true
    }
    emit({ type: 'playSpell', instanceId })
    return false
  }, [game, emit])

  const resolvePendingSpellTarget = useCallback((targetInstanceId: string) => {
    if (!pendingSpell) return
    emit({ type: 'playSpell', instanceId: pendingSpell.instanceId, targetId: targetInstanceId })
    setPendingSpell(null)
  }, [pendingSpell, emit])

  const cancelPendingSpell = useCallback(() => setPendingSpell(null), [])

  const restart  = useCallback(() => { setPendingSpell(null); join() }, [join])
  const saveGame = useCallback(async () => { /* le serveur enregistre le résultat */ }, [])
  const bindAnimator = useCallback(() => { /* animations adverses non gérées (v1) */ }, [])

  return {
    phase, opponent, you, join, leave,
    game, loading: phase === 'connecting', error,
    playCard, swap, heal, attack, endTurn, restart, saveGame,
    playSpell, pendingSpell, resolvePendingSpellTarget, cancelPendingSpell,
    bindAnimator,
  }
}
