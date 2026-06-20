import { useState, useCallback, useEffect } from 'react'
import {
  type GameState, createGameState, resolveAttack, getAttackTarget,
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

function toDeckColor(color: string): DeckColor {
  const found = Object.values(DeckColor).find(v => v.toLowerCase() === color.toLowerCase())
  return found ?? DeckColor.Red
}

function buildGameFromDecks(activeDecks: Deck[]): GameState {
  if (activeDecks.length < 2) {
    throw new Error('You need exactly 2 active decks to play.')
  }

  const sourceA = activeDecks[0].cards
  const sourceB = activeDecks[1].cards

  const isLegend = (c: Deck['cards'][number]) => c.type.toLowerCase() === 'legend'

  const legendA = sourceA.find(isLegend)
  const legendB = sourceB.find(isLegend)

  if (!legendA) throw new Error(`Deck "${activeDecks[0].name}" has no Legend card.`)
  if (!legendB) throw new Error(`Deck "${activeDecks[1].name}" has no Legend card.`)

  const deckA = sourceA.filter(c => !isLegend(c)).map(resolveDeckCard)
  const deckB = sourceB.filter(c => !isLegend(c)).map(resolveDeckCard)

  const playerColor  = toDeckColor(activeDecks[0].color)
  const playerLegend = resolveDeckCard(legendA)

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

      const target = explicitTarget ?? getAttackTarget('player', g)
      if (!target) return

      resolveAttack(attacker, target, g)
      cleanupBoard(g.enemy)
    })
  }, [update])

  const endTurn = useCallback(() => {
    update(g => {
      const result = endPlayerTurn(g)
      if (result.status !== 'ongoing') return
      runAITurn(g)
      endEnemyTurn(g)
    })
  }, [update])

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
    playCard, swap, attack, endTurn, restart, saveGame,
    playSpell, pendingSpell, resolvePendingSpellTarget, cancelPendingSpell,
  }
}