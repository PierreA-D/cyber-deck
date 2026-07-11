import { type MatchState, resolveAttack, resolveHeal, getAttackTarget, cleanupBoard, opponentId } from './GameEngine'
import { playCardToBoard, isDefeated } from './PlayerState'
import { CardType } from './CardEnums'
import { isAlive, type CardInstance } from './CardInstance'

// ─── Hooks d'animation du tour IA ─────────────────────────────────────────────
// Permettent au tour de l'IA de se dérouler visiblement, action par action.
export interface AITurnHooks {
  // Pousse l'état courant (muté) vers l'UI pour rendre l'action visible.
  commit: () => void
  // Joue l'animation d'attaque entre deux cartes ; se résout à la fin.
  animateAttack?: (attackerId: string, targetId: string) => Promise<void>
  // Met le tour en pause pendant `ms` millisecondes.
  wait: (ms: number) => Promise<void>
}

// Rythme du tour IA (ms) — laisse au joueur le temps d'observer chaque action.
const PLAY_DELAY   = 500
const HEAL_DELAY   = 550
const ATTACK_DELAY = 250

// ─── AI Turn ──────────────────────────────────────────────────────────────────
// Exécute un tour complet pour l'IA, action par action, dans l'ordre :
// 1. Jouer les cartes de la main (Defenders > Warriors > Healers)
// 2. Soigner les unités blessées
// 3. Attaquer avec toutes les unités disponibles

export async function runAITurn(state: MatchState, aiId: string, hooks: AITurnHooks): Promise<void> {
  await playAIHand(state, aiId, hooks)
  await healAIUnits(state, aiId, hooks)
  await attackWithAI(state, aiId, hooks)
  cleanupBoard(state.players[opponentId(state, aiId)])
  hooks.commit()
}

// ─── 1. Jouer les cartes ──────────────────────────────────────────────────────

async function playAIHand(state: MatchState, aiId: string, hooks: AITurnHooks): Promise<void> {
  const priority = [CardType.Defender, CardType.Warrior, CardType.Healer]
  const ai = state.players[aiId]

  for (const type of priority) {
    // La main change à chaque carte jouée : on re-sélectionne à chaque tour.
    let card = ai.hand.find(c => c.data.type === type)
    while (card) {
      playCardToBoard(ai, card.instanceId)
      hooks.commit()
      await hooks.wait(PLAY_DELAY)
      card = ai.hand.find(c => c.data.type === type)
    }
  }
}

// ─── 2. Soigner ───────────────────────────────────────────────────────────────

async function healAIUnits(state: MatchState, aiId: string, hooks: AITurnHooks): Promise<void> {
  let healer = findReadyHealer(state, aiId)
  while (healer) {
    const target = getBestHealTarget(state, aiId)
    if (!target) break

    resolveHeal(healer, target, state)
    hooks.commit()
    await hooks.wait(HEAL_DELAY)
    healer = findReadyHealer(state, aiId)
  }
}

function findReadyHealer(state: MatchState, aiId: string): CardInstance | undefined {
  return state.players[aiId].board.find(
    c => c.data.type === CardType.Healer && !c.isExhausted && isAlive(c)
  )
}

function getBestHealTarget(state: MatchState, aiId: string) {
  const ai = state.players[aiId]
  // Unité la plus blessée sur le board
  const boardUnits = ai.board.filter(
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
  const legend = ai.legend
  if (legend.currentHp < (legend.data.maxHp ?? 5)) {
    return legend
  }

  return null
}

// ─── 3. Attaquer ──────────────────────────────────────────────────────────────

async function attackWithAI(state: MatchState, aiId: string, hooks: AITurnHooks): Promise<void> {
  const oppId = opponentId(state, aiId)
  let attacker = findReadyAttacker(state, aiId)
  while (attacker) {
    // Le champion adverse est mort : inutile de continuer à frapper.
    if (isDefeated(state.players[oppId])) break

    const target = getAttackTarget(aiId, state)
    if (!target) {
      attacker.isExhausted = true
      attacker = findReadyAttacker(state, aiId)
      continue
    }

    // Anime l'attaque avant d'appliquer les dégâts, comme pour le joueur.
    if (hooks.animateAttack) {
      await hooks.animateAttack(attacker.instanceId, target.instanceId)
    }
    resolveAttack(attacker, target, state)
    cleanupBoard(state.players[oppId])
    hooks.commit()
    await hooks.wait(ATTACK_DELAY)

    attacker = findReadyAttacker(state, aiId)
  }

  cleanupBoard(state.players[oppId])
}

function findReadyAttacker(state: MatchState, aiId: string): CardInstance | undefined {
  return state.players[aiId].board.find(
    c => !c.isExhausted && isAlive(c) && c.data.type === CardType.Warrior
  )
}