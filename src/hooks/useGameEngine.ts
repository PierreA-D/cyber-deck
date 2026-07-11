import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  type MatchState, createMatchState, projectMatch,
  resolveAttack, getAttackTarget, getValidAttackTargets, resolveHeal,
  endTurn as advanceTurn, cleanupBoard,
  resolveSpell, resolveAutoTarget, type SpellTarget,
  createPlayerState, playSwap, playCardToBoard, playSpellCard,
  generateDeck, getLegend, type Deck, buildPlayerFromActiveDecks,
  DeckColor, TargetType,
  runAITurn,
  isSpellCard, type CardInstance,
} from '@cyber-deck/engine'
import { getDeckActive } from '../lib/deckApi'
import { useAuth } from '../context/useAuth'
import type { GameDriver } from './gameDriver'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

// Sièges de la partie solo : le joueur humain affronte le bot.
const HUMAN_ID = 'player'
const AI_ID    = 'enemy'

function buildMatchFromDecks(activeDecks: Deck[]): MatchState {
  const player = buildPlayerFromActiveDecks(HUMAN_ID, activeDecks)
  const enemy  = createPlayerState(
    AI_ID,
    generateDeck(DeckColor.Blue),
    generateDeck(DeckColor.Blue),
    getLegend(DeckColor.Blue),
  )

  return createMatchState(
    { playerId: HUMAN_ID, controller: 'human' }, player,
    { playerId: AI_ID,    controller: 'ai' },    enemy,
  )
}

export function useGameEngine(): GameDriver {
  const { token } = useAuth()
  const [match,   setMatch]   = useState<MatchState | null>(null)
  const [loading, setLoading] = useState(() => !!token)
  const [error,   setError]   = useState<string | null>(null)

  // Vue projetée consommée par l'UI (perspective du joueur humain).
  const game = useMemo(() => (match ? projectMatch(match, HUMAN_ID) : null), [match])

  // Sort en attente d'une cible manuelle (uniquement single_card + manual)
  const [pendingSpell, setPendingSpell] = useState<CardInstance | null>(null)

  // Référence toujours à jour vers l'état courant (lecture hors closure).
  const matchRef = useRef<MatchState | null>(null)
  useEffect(() => { matchRef.current = match }, [match])

  // Callback d'animation d'attaque IA, relié par GameBoard via bindAnimator.
  const onAIAttackRef = useRef<((attackerId: string, targetId: string) => Promise<void>) | undefined>(undefined)
  const bindAnimator = useCallback((fn: (attackerId: string, targetId: string) => Promise<void>) => {
    onAIAttackRef.current = fn
  }, [])

  // Empêche de relancer le tour IA tant qu'il est en cours.
  const aiRunningRef = useRef(false)

  const loadActiveMatch = useCallback((authToken: string) => {
    setLoading(true)
    setError(null)

    return getDeckActive(authToken)
      .then(activeDecks => setMatch(buildMatchFromDecks(activeDecks)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load active deck.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!token) return
    queueMicrotask(() => { void loadActiveMatch(token) })
  }, [token, loadActiveMatch])

  const update = useCallback((fn: (m: MatchState) => void) => {
    setMatch(prev => {
      if (!prev) return prev
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const playCard = useCallback((instanceId: string) => {
    update(m => { playCardToBoard(m.players[HUMAN_ID], instanceId) })
  }, [update])

  const swap = useCallback(() => {
    update(m => { playSwap(m.players[HUMAN_ID]) })
  }, [update])

  const heal = useCallback((healerInstanceId: string, targetInstanceId: string) => {
    update(m => {
      const me = m.players[HUMAN_ID]
      const healer = me.board.find(c => c.instanceId === healerInstanceId)
      if (!healer) return

      const target = [...me.board, me.legend].find(c => c.instanceId === targetInstanceId)
      if (!target) return

      resolveHeal(healer, target, m)
    })
  }, [update])

  // Tente de jouer une carte Sort.
  // Retourne true si la carte attend un clic du joueur sur une cible (single_card manual).
  // Sinon résout immédiatement (champion, board, ou single_card auto).
  const playSpell = useCallback((instanceId: string): boolean => {
    if (!game) return false

    const card = game.player.hand.find(c => c.instanceId === instanceId)
    if (!card || !isSpellCard(card) || !card.data.spellEffect) return false

    const effect = card.data.spellEffect

    // single_card + manual → attend un clic
    if (effect.targetType === TargetType.SingleCard && effect.targetMode === 'manual') {
      setPendingSpell(card)
      return true
    }

    // Tout le reste se résout automatiquement (champion, board, single_card auto)
    update(m => {
      const resolved = playSpellCard(m.players[HUMAN_ID], instanceId)
      if (!resolved) return
      const target = resolveAutoTarget(effect, HUMAN_ID, m)
      if (target) resolveSpell(effect, target, m)
    })
    return false
  }, [game, update])

  // Appelé quand le joueur clique une carte cible pour un sort single_card manual en attente
  const resolvePendingSpellTarget = useCallback((targetInstanceId: string) => {
    if (!pendingSpell) return

    update(m => {
      const effect = pendingSpell.data.spellEffect
      if (!effect) return

      const allCards = [...m.players[HUMAN_ID].board, ...m.players[AI_ID].board]
      const targetCard = allCards.find(c => c.instanceId === targetInstanceId)
      if (!targetCard) return

      const resolved = playSpellCard(m.players[HUMAN_ID], pendingSpell.instanceId)
      if (!resolved) return

      const target: SpellTarget = { kind: 'card', card: targetCard }
      resolveSpell(effect, target, m)
    })

    setPendingSpell(null)
  }, [pendingSpell, update])

  const cancelPendingSpell = useCallback(() => {
    setPendingSpell(null)
  }, [])

  const attack = useCallback((attackerInstanceId: string, targetInstanceId?: string) => {
    update(m => {
      const attacker = m.players[HUMAN_ID].board.find(c => c.instanceId === attackerInstanceId)
      if (!attacker) return

      const enemy = m.players[AI_ID]
      const explicitTarget = targetInstanceId
        ? [...enemy.board, enemy.legend].find(c => c.instanceId === targetInstanceId)
        : undefined

      const validTargets = getValidAttackTargets(HUMAN_ID, m)
      const target = (explicitTarget && validTargets.includes(explicitTarget))
        ? explicitTarget
        : getAttackTarget(HUMAN_ID, m)
      if (!target) return

      resolveAttack(attacker, target, m)
      cleanupBoard(enemy)
    })
  }, [update])

  // Termine le tour du joueur puis déroule le tour de l'IA action par action,
  // en poussant un snapshot après chaque action pour que le joueur la voie.
  const endTurn = useCallback(() => {
    if (aiRunningRef.current) return
    const current = matchRef.current
    if (!current || current.activePlayerId !== HUMAN_ID || current.result.status !== 'ongoing') return

    aiRunningRef.current = true
    setPendingSpell(null)

    const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

    void (async () => {
      try {
        // Copie de travail unique : on mute puis on pousse des clones en snapshots.
        const work = structuredClone(current)

        const result = advanceTurn(work, HUMAN_ID)
        setMatch(structuredClone(work))
        if (result.status !== 'ongoing') return

        // Laisse voir la fin du tour joueur avant que l'IA agisse.
        await wait(350)

        await runAITurn(work, AI_ID, {
          commit: () => setMatch(structuredClone(work)),
          animateAttack: onAIAttackRef.current,
          wait,
        })

        advanceTurn(work, AI_ID)
        setMatch(structuredClone(work))
      } finally {
        aiRunningRef.current = false
      }
    })()
  }, [])

  const restart = useCallback(() => {
    if (!token) return
    setPendingSpell(null)
    void loadActiveMatch(token)
  }, [token, loadActiveMatch])

  const saveGame = useCallback(async (result: string, turnsCount: number) => {
    if (!token) return
    try {
      await fetch(`${API}/api/games`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result, turnsCount }),
      })
    } catch (e) {
      console.error('Failed to save game:', e)
    }
  }, [token])

  return {
    game, loading, error,
    playCard, swap, heal, attack, endTurn, restart, saveGame,
    playSpell, pendingSpell, resolvePendingSpellTarget, cancelPendingSpell,
    bindAnimator,
  }
}