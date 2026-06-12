import { useState, useCallback } from 'react'
import { type GameState, createGameState, resolveAttack, getAttackTarget, endPlayerTurn, endEnemyTurn, cleanupBoard } from '../engine/GameEngine'
import { createPlayerState, playSwap, playCardToBoard } from '../engine/PlayerState'
import { generateDeck, getChampion } from '../engine/CardDatabase'
import { DeckColor } from '../engine/CardEnums'
import { runAITurn } from '../engine/AIPlayer'

function initGame(): GameState {
  const player = createPlayerState(
    'player',
    generateDeck(DeckColor.Red),
    generateDeck(DeckColor.Green),
    getChampion(DeckColor.Red),
  )
  const enemy = createPlayerState(
    'enemy',
    generateDeck(DeckColor.Blue),
    generateDeck(DeckColor.Green),
    getChampion(DeckColor.Blue),
  )
  return createGameState(player, enemy)
}

export function useGameEngine() {
  const [game, setGame] = useState<GameState>(() => initGame())

  const update = useCallback((fn: (g: GameState) => void) => {
    setGame(prev => {
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

  const attack = useCallback((attackerInstanceId: string) => {
    update(g => {
      const attacker = g.player.board.find(c => c.instanceId === attackerInstanceId)
      if (!attacker) return
      const target = getAttackTarget('player', g)
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
    setGame(initGame())
  }, [])

  return { game, playCard, swap, attack, endTurn, restart }
}