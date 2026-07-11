import { type PlayerState, isDefeated, endTurn as playerEndTurn } from './PlayerState'
import { type CardInstance, applyDamage, getEffectiveAttack, isAlive, isLegend } from './CardInstance'
import { TargetType, TargetSide, TargetRule, EffectType, CardType } from './CardEnums'
import { type SpellEffect } from './CardData'

export const GamePhase = {
  Setup:      'Setup',
  PlayerTurn: 'PlayerTurn',
  EnemyTurn:  'EnemyTurn',
  GameOver:   'GameOver',
} as const;

// ─── Vue projetée (consommée par l'UI) ────────────────────────────────────────
// Perspective d'un joueur : « player » = soi, « enemy » = l'adversaire.
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

// ─── État autoritaire neutre (partagé serveur/client) ─────────────────────────
// Aucune notion de « joueur » vs « ennemi » : deux sièges identifiés par playerId.
export type Controller = 'human' | 'ai' | 'remote'

export interface Seat {
  playerId:   string
  controller: Controller
}

export type MatchResult =
  | { status: 'ongoing' }
  | { status: 'win'; winnerId: string }
  | { status: 'draw' }

export interface MatchState {
  players:        Record<string, PlayerState>
  seats:          readonly [Seat, Seat]
  activePlayerId: string
  turn:           number
  log:            CombatEvent[]
  result:         MatchResult
}

export type SpellTarget =
  | { kind: 'card'; card: CardInstance }
  | { kind: 'board'; cards: CardInstance[] }
  | { kind: 'legend'; legend: CardInstance }

export function createMatchState(
  seatA: Seat, playerA: PlayerState,
  seatB: Seat, playerB: PlayerState,
): MatchState {
  return {
    players: { [seatA.playerId]: playerA, [seatB.playerId]: playerB },
    seats:   [seatA, seatB],
    activePlayerId: seatA.playerId,
    turn:    1,
    log:     [],
    result:  { status: 'ongoing' },
  }
}

// Renvoie l'identifiant du siège adverse.
export function opponentId(state: MatchState, playerId: string): string {
  const [a, b] = state.seats
  return playerId === a.playerId ? b.playerId : a.playerId
}

// Projette l'état neutre en une vue orientée « viewerId » pour l'UI.
// NOTE (multi) : activer `maskOpponent` côté serveur pour masquer les zones
// privées adverses (main, ordre du deck) avant l'envoi au client distant.
export interface ProjectOptions {
  maskOpponent?: boolean
}

export function projectMatch(
  state: MatchState,
  viewerId: string,
  opts: ProjectOptions = {},
): GameState {
  const oppId = opponentId(state, viewerId)

  let phase: keyof typeof GamePhase
  if (state.result.status !== 'ongoing') phase = GamePhase.GameOver
  else if (state.activePlayerId === viewerId) phase = GamePhase.PlayerTurn
  else phase = GamePhase.EnemyTurn

  const enemy = opts.maskOpponent
    ? maskPrivateZones(state.players[oppId])
    : state.players[oppId]

  return {
    player: state.players[viewerId],
    enemy,
    phase,
    turn:   state.turn,
    log:    state.log,
    result: projectResult(state.result, viewerId),
  }
}

// Cache la main et l'ordre des decks de l'adversaire (anti-triche réseau).
// Copie superficielle : ne mute pas l'état autoritaire.
function maskPrivateZones(p: PlayerState): PlayerState {
  return { ...p, hand: [], activeDeck: [], passiveDeck: [] }
}

function projectResult(result: MatchResult, viewerId: string): GameResult {
  if (result.status === 'ongoing') return { status: 'ongoing' }
  if (result.status === 'draw')    return { status: 'draw' }
  return { status: result.winnerId === viewerId ? 'player_wins' : 'enemy_wins' }
}

function log(state: MatchState, type: CombatEvent['type'], message: string): void {
  state.log.push({ type, message, timestamp: Date.now() })
}

export function checkWinCondition(state: MatchState): MatchResult {
  const [a, b] = state.seats
  const aDefeated = isDefeated(state.players[a.playerId])
  const bDefeated = isDefeated(state.players[b.playerId])

  if (aDefeated && bDefeated) return { status: 'draw' }
  if (aDefeated) return { status: 'win', winnerId: b.playerId }
  if (bDefeated) return { status: 'win', winnerId: a.playerId }
  return { status: 'ongoing' }
}

export function canAttack(card: CardInstance): boolean {
  return card.data.type === CardType.Warrior
}

export function resolveAttack(
  attacker: CardInstance,
  target:   CardInstance,
  state:    MatchState,
): number {
  if (!canAttack(attacker)) {
    log(state, 'attack', `${attacker.data.name} cannot attack.`)
    return 0
  }

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
  const cards = [...playerState.board, playerState.legend].filter(Boolean)

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

export function resolveHeal(healer: CardInstance, target: CardInstance, state: MatchState): number {
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
  casterId: string,
  state: MatchState,
): SpellTarget | null {
  const sideId = effect.targetSide === TargetSide.Ally ? casterId : opponentId(state, casterId)
  const sideState = state.players[sideId]

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

function applyEffectToCard(card: CardInstance, effect: SpellEffect, state: MatchState): void {
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
  state: MatchState,
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

export function getValidAttackTargets(
  attackerId: string,
  state: MatchState,
): CardInstance[] {
  const targetState = state.players[opponentId(state, attackerId)]
  const board = targetState.board.filter(isAlive)

  // Les Defenders font office de taunt : tant qu'il en reste, on doit les viser.
  const defenders = board.filter(c => c.data.type === CardType.Defender)
  if (defenders.length > 0) return defenders

  // Sinon, le Warrior peut cibler les Healers ennemis ou le champion.
  // Les Warriors ennemis ne sont jamais ciblables.
  const healers = board.filter(c => c.data.type === CardType.Healer)
  return [...healers, targetState.legend]
}

export function isValidAttackTarget(
  attackerId: string,
  target: CardInstance,
  state: MatchState,
): boolean {
  return getValidAttackTargets(attackerId, state).includes(target)
}

export function getAttackTarget(attackerId: string, state: MatchState): CardInstance | null {
  const targets = getValidAttackTargets(attackerId, state)
  return targets[0] ?? null
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

// Termine le tour de `actorId` : nettoyage, expiration des effets, pioche,
// puis passe la main au siège adverse. Le compteur de tour s'incrémente
// à chaque retour au premier siège (un tour complet = un aller-retour).
export function endTurn(state: MatchState, actorId: string): MatchResult {
  const [a, b] = state.seats
  cleanupBoard(state.players[a.playerId])
  cleanupBoard(state.players[b.playerId])
  tickTemporaryEffects(state.players[actorId])

  const drawResult = playerEndTurn(state.players[actorId])
  if (drawResult === 'deck_empty') {
    log(state, 'draw', `${actorId}'s deck is empty — no card drawn.`)
  } else if (drawResult === 'hand_full') {
    log(state, 'draw', `${actorId}'s hand is full — no card drawn.`)
  }

  const nextId = opponentId(state, actorId)
  state.activePlayerId = nextId
  if (nextId === state.seats[0].playerId) state.turn += 1

  const result = checkWinCondition(state)
  state.result = result

  if (result.status !== 'ongoing') {
    log(state, 'game_over', `Game over: ${result.status}`)
  }

  return result
}