import { type GameState, resolveAttack, resolveHeal, getAttackTarget, cleanupBoard } from './GameEngine'
import { playCardToBoard } from './PlayerState'
import { CardType } from './CardEnums'
import { isAlive } from './CardInstance'

// ─── AI Turn ──────────────────────────────────────────────────────────────────
// Exécute un tour complet pour l'IA dans l'ordre :
// 1. Jouer les cartes de la main (Defenders > Warriors > Healers)
// 2. Soigner les unités blessées
// 3. Attaquer avec toutes les unités disponibles

export function runAITurn(state: GameState): void {
  playAIHand(state)
  healAIUnits(state)
  attackWithAI(state)
  cleanupBoard(state.player)
}

// ─── 1. Jouer les cartes ──────────────────────────────────────────────────────

function playAIHand(state: GameState): void {
  const priority = [CardType.Defender, CardType.Warrior, CardType.Healer]

  for (const type of priority) {
    const cards = state.enemy.hand.filter(
      c => c.data.type === type && c.data.id !== 'swap'
    )
    for (const card of cards) {
      playCardToBoard(state.enemy, card.instanceId)
    }
  }
}

// ─── 2. Soigner ───────────────────────────────────────────────────────────────

function healAIUnits(state: GameState): void {
  const healers = state.enemy.board.filter(
    c => c.data.type === CardType.Healer && !c.isExhausted && isAlive(c)
  )

  for (const healer of healers) {
    const target = getBestHealTarget(state)
    if (target) resolveHeal(healer, target, state)
  }
}

function getBestHealTarget(state: GameState) {
  // Unité la plus blessée sur le board
  const boardUnits = state.enemy.board.filter(
    c => isAlive(c) && c.data.maxHp !== undefined && c.currentHp < c.data.maxHp
  )

  if (boardUnits.length > 0) {
    return boardUnits.reduce((prev, curr) => {
      const prevMissing = (prev.data.maxHp ?? 0) - prev.currentHp
      const currMissing = (curr.data.maxHp ?? 0) - curr.currentHp
      return currMissing > prevMissing ? curr : prev
    })
  }

  // Si aucune unité blessée, soigne le Legend si nécessaire
  const legend = state.enemy.legend
  if (legend.currentHp < (legend.data.maxHp ?? 5)) {
    return legend
  }

  return null
}

// ─── 3. Attaquer ──────────────────────────────────────────────────────────────

function attackWithAI(state: GameState): void {
  const attackers = state.enemy.board.filter(
    c => !c.isExhausted && isAlive(c) && c.data.type !== CardType.Healer
  )

  for (const attacker of attackers) {
    const target = getAttackTarget('enemy', state)
    if (target) resolveAttack(attacker, target, state)
  }

  cleanupBoard(state.player)
}