import { useState, useCallback, useEffect, useRef } from 'react'
import {
  type GameState, GamePhase, createGameState, resolveAttack, getAttackTarget, getValidAttackTargets, resolveHeal,
  endPlayerTurn, endEnemyTurn, cleanupBoard,
  resolveSpell, resolveAutoTarget, type SpellTarget,
} from '../engine/GameEngine'
import { createPlayerState, playSwap, playCardToBoard, playSpellCard } from '../engine/PlayerState'
import { generateDeck, getLegend, getDeckActive, resolveDeckCard, type Deck, shuffle } from '../engine/CardDatabase'
import { DeckColor, TargetType } from '../engine/CardEnums'
import { runAITurn } from '../engine/AIPlayer'
import { isSpellCard, type CardInstance } from '../engine/CardInstance'
import { useAuth } from '../context/useAuth'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

function buildGameFromDecks(activeDecks: Deck[]): GameState {
  if (activeDecks.length < 2) {
    throw new Error('You need exactly 2 active decks to play.')
  }

  const sourceA = activeDecks[0].cards
  const sourceB = activeDecks[1].cards

  const isLegend = (c: Deck['cards'][number]) => c.type.toLowerCase() === 'legend'

  const legends = [...sourceA, ...sourceB].filter(isLegend)
  if (legends.length === 0) throw new Error(`You need exactly 1 legend across your decks.`)
  if (legends.length > 1) throw new Error(`You can only have 1 legend across your decks.`)

  const deckA = sourceA.filter(c => !isLegend(c)).map(resolveDeckCard)
  const deckB = sourceB.filter(c => !isLegend(c)).map(resolveDeckCard)

  const playerLegend = resolveDeckCard(legends[0])

  const player = createPlayerState('player', shuffle(deckA), shuffle(deckB), playerLegend)
  const enemy  = createPlayerState(
    'enemy',
    generateDeck(DeckColor.Blue),
    generateDeck(DeckColor.Blue),
    getLegend(DeckColor.Blue),
  )

  return createGameState(player, enemy)
}

interface UseGameEngineOptions {
  onAIAttack?: (attackerId: string, targetId: string) => Promise<void>
}

export function useGameEngine(options?: UseGameEngineOptions) {
  const { token } = useAuth()
  const [game,    setGame]    = useState<GameState | null>(null)
  const [loading, setLoading] = useState(() => !!token)
  const [error,   setError]   = useState<string | null>(null)

  // Sort en attente d'une cible manuelle (uniquement single_card + manual)
  const [pendingSpell, setPendingSpell] = useState<CardInstance | null>(null)

  // Référence toujours à jour vers l'état courant (lecture hors closure).
  const gameRef = useRef<GameState | null>(null)
  useEffect(() => { gameRef.current = game }, [game])

  // Callback d'animation d'attaque IA, gardé à jour sans recréer les closures.
  const onAIAttackRef = useRef(options?.onAIAttack)
  useEffect(() => { onAIAttackRef.current = options?.onAIAttack })

  // Empêche de relancer le tour IA tant qu'il est en cours.
  const aiRunningRef = useRef(false)

  const loadActiveGame = useCallback((authToken: string) => {
    setLoading(true)
    setError(null)

    return getDeckActive(authToken)
      .then(activeDecks => setGame(buildGameFromDecks(activeDecks)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load active deck.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!token) return
    queueMicrotask(() => { void loadActiveGame(token) })
  }, [token, loadActiveGame])

  const update = useCallback((fn: (g: GameState) => void) => {
    setGame(prev => {
      if (!prev) return prev
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const playCard = useCallback((instanceId: string) => {
    update(g => { playCardToBoard(g.player, instanceId) })
  }, [update])

  const swap = useCallback(() => {
    update(g => { playSwap(g.player) })
  }, [update])

  const heal = useCallback((healerInstanceId: string, targetInstanceId: string) => {
    update(g => {
      const healer = g.player.board.find(c => c.instanceId === healerInstanceId)
      if (!healer) return

      const target = [...g.player.board, g.player.legend].find(c => c.instanceId === targetInstanceId)
      if (!target) return

      resolveHeal(healer, target, g)
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
    update(g => {
      const resolved = playSpellCard(g.player, instanceId)
      if (!resolved) return
      const target = resolveAutoTarget(effect, 'player', g)
      if (target) resolveSpell(effect, target, g)
    })
    return false
  }, [game, update])

  // Appelé quand le joueur clique une carte cible pour un sort single_card manual en attente
  const resolvePendingSpellTarget = useCallback((targetInstanceId: string) => {
    if (!pendingSpell) return

    update(g => {
      const effect = pendingSpell.data.spellEffect
      if (!effect) return

      const allCards = [...g.player.board, ...g.enemy.board]
      const targetCard = allCards.find(c => c.instanceId === targetInstanceId)
      if (!targetCard) return

      const resolved = playSpellCard(g.player, pendingSpell.instanceId)
      if (!resolved) return

      const target: SpellTarget = { kind: 'card', card: targetCard }
      resolveSpell(effect, target, g)
    })

    setPendingSpell(null)
  }, [pendingSpell, update])

  const cancelPendingSpell = useCallback(() => {
    setPendingSpell(null)
  }, [])

  const attack = useCallback((attackerInstanceId: string, targetInstanceId?: string) => {
    update(g => {
      const attacker = g.player.board.find(c => c.instanceId === attackerInstanceId)
      if (!attacker) return

      const explicitTarget = targetInstanceId
        ? [...g.enemy.board, g.enemy.legend].find(c => c.instanceId === targetInstanceId)
        : undefined

      const validTargets = getValidAttackTargets('player', g)
      const target = (explicitTarget && validTargets.includes(explicitTarget))
        ? explicitTarget
        : getAttackTarget('player', g)
      if (!target) return

      resolveAttack(attacker, target, g)
      cleanupBoard(g.enemy)
    })
  }, [update])

  // Termine le tour du joueur puis déroule le tour de l'IA action par action,
  // en poussant un snapshot après chaque action pour que le joueur la voie.
  const endTurn = useCallback(() => {
    if (aiRunningRef.current) return
    const current = gameRef.current
    if (!current || current.phase !== GamePhase.PlayerTurn) return

    aiRunningRef.current = true
    setPendingSpell(null)

    const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

    void (async () => {
      try {
        // Copie de travail unique : on mute puis on pousse des clones en snapshots.
        const work = structuredClone(current)

        const result = endPlayerTurn(work)
        setGame(structuredClone(work))
        if (result.status !== 'ongoing') return

        // Laisse voir la fin du tour joueur avant que l'IA agisse.
        await wait(350)

        await runAITurn(work, {
          commit: () => setGame(structuredClone(work)),
          animateAttack: onAIAttackRef.current,
          wait,
        })

        endEnemyTurn(work)
        setGame(structuredClone(work))
      } finally {
        aiRunningRef.current = false
      }
    })()
  }, [])

  const restart = useCallback(() => {
    if (!token) return
    setPendingSpell(null)
    void loadActiveGame(token)
  }, [token, loadActiveGame])

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
  }
}