import { type PlayerState, isDefeated, endTurn as playerEndTurn } from './PlayerState'
import { type CardInstance, applyDamage, getEffectiveAttack, isAlive, isChampion } from './CardInstance'
import { CardType } from './CardEnums'

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

export function resolveAttack(attacker: CardInstance, target: CardInstance, state: GameState): number {
  if (attacker.isExhausted) {
    log(state, 'attack', `${attacker.data.name} is exhausted and cannot attack.`)
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

export function getAttackTarget(attackerOwner: 'player' | 'enemy', state: GameState): CardInstance | null {
  const targetState = attackerOwner === 'player' ? state.enemy : state.player
  const board = targetState.board.filter(isAlive)

  if (board.length === 0) return targetState.champion

  const defender = board.find(c => c.data.type === CardType.Defender)
  if (defender) return defender

  const warrior = board.find(c => c.data.type === CardType.Warrior)
  if (warrior) return warrior

  return board[0]
}

export function cleanupBoard(playerState: PlayerState): void {
  const dead = playerState.board.filter(c => !isAlive(c) && !isChampion(c))
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