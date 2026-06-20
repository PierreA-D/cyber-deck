import { type PlayerState, isDefeated, endTurn as playerEndTurn } from './PlayerState'
import { type CardInstance, applyDamage, getEffectiveAttack, isAlive, isLegend } from './CardInstance'
import { TargetType, TargetSide, TargetMode, TargetRule, EffectType, CardType } from './CardEnums'
import { type SpellEffect } from './CardData'

export const GamePhase = {
  Setup:      'Setup',
  PlayerTurn: 'PlayerTurn',
  EnemyTurn:  'EnemyTurn',
  GameOver:   'GameOver',
} as const;

export type GameResult =
  | { status: 'ongoing' }
  | { status: 'player_wins' }
  | { status: 'enemy_wins' }
  | { status: 'draw' }

export interface CombatEvent {
  type: 'attack' | 'heal' | 'death' | 'swap' | 'draw' | 'game_over'
  message: string
  timestamp: number
}

export interface GameState {
  player: PlayerState
  enemy:  PlayerState
  phase:  keyof typeof GamePhase
  turn:   number
  log:    CombatEvent[]
  result: GameResult
}

export type SpellTarget =
  | { kind: 'card'; card: CardInstance }
  | { kind: 'board'; cards: CardInstance[] }
  | { kind: 'legend'; legend: CardInstance }

export function createGameState(player: PlayerState, enemy: PlayerState): GameState {
  return {
    player,
    enemy,
    phase:  GamePhase.PlayerTurn,
    turn:   1,
    log:    [],
    result: { status: 'ongoing' },
  }
}

function log(state: GameState, type: CombatEvent['type'], message: string): void {
  state.log.push({ type, message, timestamp: Date.now() })
}

export function checkWinCondition(state: GameState): GameResult {
  const playerDefeated = isDefeated(state.player)
  const enemyDefeated  = isDefeated(state.enemy)

  if (playerDefeated && enemyDefeated) return { status: 'draw' }
  if (playerDefeated) return { status: 'enemy_wins' }
  if (enemyDefeated)  return { status: 'player_wins' }
  return { status: 'ongoing' }
}

export function resolveAttack(
  attacker: CardInstance,
  target:   CardInstance,
  state:    GameState,
): number {
  if (attacker.isExhausted) {
    log(state, 'attack', `${attacker.data.name} is exhausted and cannot attack.`)
    return 0
  }

  if (attacker.isStunned) {
    log(state, 'attack', `${attacker.data.name} is stunned and cannot attack.`)
    attacker.isExhausted = true
    return 0
  }

  const dmg = applyDamage(target, getEffectiveAttack(attacker))
  attacker.isExhausted = true

  log(state, 'attack', `${attacker.data.name} attacks ${target.data.name} for ${dmg} damage.`)

  if (!isAlive(target)) {
    log(state, 'death', `${target.data.name} has been destroyed.`)
  }

  return dmg
}

function tickTemporaryEffects(playerState: PlayerState): void {
  const cards = [...playerState.board, playerState.champion].filter(Boolean)

  for (const card of cards) {
    if (card.buffExpiresIn !== undefined) {
      card.buffExpiresIn -= 1
      if (card.buffExpiresIn <= 0) {
        card.attackBuff = 0
        card.defenseBuff = 0
        card.buffExpiresIn = undefined
      }
    }
    if (card.isStunned) {
      card.isStunned = false
    }
  }
}

export function resolveHeal(healer: CardInstance, target: CardInstance, state: GameState): number {
  if (healer.data.type !== CardType.Healer) return 0
  if (healer.isExhausted) return 0

  const amount = healer.data.healAmount ?? 0
  const maxHp  = target.data.maxHp ?? target.currentHp
  const healed = Math.min(amount, maxHp - target.currentHp)
  target.currentHp += healed
  healer.isExhausted = true

  log(state, 'heal', `${healer.data.name} heals ${target.data.name} for ${healed} HP.`)
  return healed
}

export function resolveAutoTarget(
  effect: SpellEffect,
  casterOwner: 'player' | 'enemy',
  state: GameState,
): SpellTarget | null {
  const side = effect.targetSide === TargetSide.Ally ? casterOwner : (casterOwner === 'player' ? 'enemy' : 'player')
  const sideState = side === 'player' ? state.player : state.enemy

  if (effect.targetType === TargetType.Legend) {
    return { kind: 'legend', legend: sideState.legend }
  }

  if (effect.targetType === TargetType.Board) {
    return { kind: 'board', cards: sideState.board.filter(isAlive) }
  }

  // single_card en mode auto — applique la targetRule
  const aliveBoard = sideState.board.filter(isAlive)
  if (aliveBoard.length === 0) return null

  let chosen: CardInstance
  switch (effect.targetRule) {
    case TargetRule.LowestHp:
      chosen = aliveBoard.reduce((a, b) => a.currentHp < b.currentHp ? a : b)
      break
    case TargetRule.HighestAttack:
      chosen = aliveBoard.reduce((a, b) => getEffectiveAttack(a) > getEffectiveAttack(b) ? a : b)
      break
    case TargetRule.SelfLegend:
      return { kind: 'legend', legend: sideState.legend }
    case TargetRule.Random:
      chosen = aliveBoard[Math.floor(Math.random() * aliveBoard.length)]
      break
    default:
      chosen = aliveBoard[0]
  }

  return { kind: 'card', card: chosen }
}

function applyEffectToCard(card: CardInstance, effect: SpellEffect, state: GameState): void {
  switch (effect.effectType) {
    case EffectType.BuffAttack:
      card.attackBuff += effect.value
      if (effect.duration) card.buffExpiresIn = effect.duration
      log(state, 'heal', `${card.data.name} gains +${effect.value} ATK.`)
      break

    case EffectType.BuffHp:
      card.currentHp += effect.value
      if (card.data.maxHp !== undefined) {
        card.currentHp = Math.min(card.currentHp, card.data.maxHp + effect.value)
      }
      log(state, 'heal', `${card.data.name} gains +${effect.value} HP.`)
      break

    case EffectType.Heal: {
      const maxHp = card.data.maxHp ?? card.currentHp
      const healed = Math.min(effect.value, maxHp - card.currentHp)
      card.currentHp += healed
      log(state, 'heal', `${card.data.name} is healed for ${healed}.`)
      break
    }

    case EffectType.Stun:
      card.isStunned = true
      log(state, 'attack', `${card.data.name} is stunned.`)
      break

    case EffectType.DebuffAttack:
      card.attackBuff -= effect.value
      if (effect.duration) card.buffExpiresIn = effect.duration
      log(state, 'attack', `${card.data.name} loses ${effect.value} ATK.`)
      break

    case EffectType.Shield:
      card.shield += effect.value
      log(state, 'heal', `${card.data.name} gains a shield of ${effect.value}.`)
      break
  }
}

// Point d'entrée principal — applique un SpellEffect sur une cible déjà résolue
export function resolveSpell(
  effect: SpellEffect,
  target: SpellTarget,
  state: GameState,
): void {
  if (target.kind === 'card') {
    applyEffectToCard(target.card, effect, state)
  } else if (target.kind === 'legend') {
    applyEffectToCard(target.legend, effect, state)
  } else if (target.kind === 'board') {
    for (const card of target.cards) {
      applyEffectToCard(card, effect, state)
    }
  }
}

export function getAttackTarget(attackerOwner: 'player' | 'enemy', state: GameState): CardInstance | null {
  const targetState = attackerOwner === 'player' ? state.enemy : state.player
  const board = targetState.board.filter(isAlive)

  if (board.length === 0) return targetState.legend

  const defender = board.find(c => c.data.type === CardType.Defender)
  if (defender) return defender

  const warrior = board.find(c => c.data.type === CardType.Warrior)
  if (warrior) return warrior

  return board[0]
}

export function cleanupBoard(playerState: PlayerState): void {
  const dead = playerState.board.filter(c => !isAlive(c) && !isLegend(c))
  for (const card of dead) {
    const idx = playerState.board.indexOf(card)
    if (idx !== -1) {
      playerState.board.splice(idx, 1)
      playerState.discard.push(card)
    }
  }
}

export function endPlayerTurn(state: GameState): GameResult {
  cleanupBoard(state.player)
  cleanupBoard(state.enemy)
  tickTemporaryEffects(state.player) 

  const drawResult = playerEndTurn(state.player)
  if (drawResult === 'deck_empty') {
    log(state, 'draw', `Player's deck is empty — no card drawn.`)
  } else if (drawResult === 'hand_full') {
    log(state, 'draw', `Player's hand is full — no card drawn.`)
  }

  state.phase = GamePhase.EnemyTurn
  const result = checkWinCondition(state)
  state.result = result

  if (result.status !== 'ongoing') {
    state.phase = GamePhase.GameOver
    log(state, 'game_over', `Game over: ${result.status}`)
  }

  return result
}

export function endEnemyTurn(state: GameState): GameResult {
  cleanupBoard(state.player)
  cleanupBoard(state.enemy)
  tickTemporaryEffects(state.enemy)

  const drawResult = playerEndTurn(state.enemy)
  if (drawResult === 'deck_empty') {
    log(state, 'draw', `Enemy's deck is empty — no card drawn.`)
  } else if (drawResult === 'hand_full') {
    log(state, 'draw', `Enemy's hand is full — no card drawn.`)
  }

  state.turn  += 1
  state.phase  = GamePhase.PlayerTurn
  const result = checkWinCondition(state)
  state.result = result

  if (result.status !== 'ongoing') {
    state.phase = GamePhase.GameOver
    log(state, 'game_over', `Game over: ${result.status}`)
  }

  return result
}