import { useState, useCallback, useEffect } from 'react'
import { type GameState, createGameState, resolveAttack, getAttackTarget, endPlayerTurn, endEnemyTurn, cleanupBoard } from '../engine/GameEngine'
import { createPlayerState, playSwap, playCardToBoard } from '../engine/PlayerState'
import { generateDeck, getChampion, getDeckActive, resolveDeckCard, type Deck } from '../engine/CardDatabase'
import { DeckColor } from '../engine/CardEnums'
import { runAITurn } from '../engine/AIPlayer'
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

  const isChampion = (c: Deck['cards'][number]) => c.type.toLowerCase() === 'champion'

  const championA = sourceA.find(isChampion)
  const championB = sourceB.find(isChampion)

  if (!championA) {
    throw new Error(`Deck "${activeDecks[0].name}" has no Champion card.`)
  }

  if (!championB) {
    throw new Error(`Deck "${activeDecks[1].name}" has no Champion card.`)
  }

  const deckA = sourceA.filter(c => !isChampion(c)).map(resolveDeckCard)
  const deckB = sourceB.filter(c => !isChampion(c)).map(resolveDeckCard)

  const playerColor    = toDeckColor(activeDecks[0].color)
  const playerChampion = resolveDeckCard(championA)

  const player = createPlayerState('player', deckA, deckB, playerChampion)
  const enemy  = createPlayerState(
    'enemy',
    generateDeck(DeckColor.Blue),
    generateDeck(DeckColor.Blue),
    getChampion(DeckColor.Blue),
  )

  return createGameState(player, enemy)
}

export function useGameEngine() {
  const { token } = useAuth()
  const [game,    setGame]    = useState<GameState | null>(null)
  const [loading, setLoading] = useState(() => !!token)
  const [error,   setError]   = useState<string | null>(null)

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
    queueMicrotask(() => {
      void loadActiveGame(token)
    })
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
    update(g => {
      playCardToBoard(g.player, instanceId)
    })
  }, [update])

  const swap = useCallback(() => {
    update(g => {
      playSwap(g.player)
    })
  }, [update])

  const attack = useCallback((attackerInstanceId: string, targetInstanceId?: string) => {
    update(g => {
      const attacker = g.player.board.find(c => c.instanceId === attackerInstanceId)
      if (!attacker) return

      const explicitTarget = targetInstanceId
        ? [...g.enemy.board, g.enemy.champion].find(c => c.instanceId === targetInstanceId)
        : undefined

      const target = explicitTarget ?? getAttackTarget('player', g)
      if (!target) return

      resolveAttack(attacker, target, g)
      cleanupBoard(g.enemy)
    })
  }, [update])

  const endTurn = useCallback(() => {
    update(g => {
      // Fin du tour joueur
      const result = endPlayerTurn(g)
      if (result.status !== 'ongoing') return

      // Tour de l'IA
      runAITurn(g)

      // Fin du tour IA
      endEnemyTurn(g)
    })
  }, [update])

  const restart = useCallback(() => {
    if (!token) return
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

  return { game, loading, error, playCard, swap, attack, endTurn, restart, saveGame }
}