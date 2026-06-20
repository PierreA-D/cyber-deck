import type { CardData } from './CardData'
import { CardType } from './CardEnums'

export interface CardInstance {
  readonly instanceId: string
  readonly data: CardData
  currentHp: number
  attackBuff: number
  defenseBuff: number
  isExhausted: boolean
  isStunned: boolean
  shield: number
  buffExpiresIn?: number
}

let _instanceCounter = 0

export function createCardInstance(data: CardData): CardInstance {
  _instanceCounter++
  return {
    instanceId: `${data.id}_${_instanceCounter}`,
    data,
    currentHp: data.maxHp ?? 0,
    attackBuff: 0,
    defenseBuff: 0,
    isExhausted: false,
    isStunned: false,
    shield: 0,
  }
}

export function isAlive(card: CardInstance): boolean {
  return card.currentHp > 0
}

export function isSwapCard(card: CardInstance): boolean {
  return card.data.id === 'swap'
}

export function getEffectiveAttack(card: CardInstance): number {
  return Math.max(0, (card.data.attack ?? 0) + card.attackBuff)
}

export function getEffectiveDefense(card: CardInstance): number {
  return Math.max(0, card.defenseBuff)
}

export function applyDamage(card: CardInstance, amount: number): number {
  if (card.shield > 0) {
    const absorbed = Math.min(card.shield, amount)
    card.shield -= absorbed
    amount -= absorbed
    if (amount <= 0) return absorbed
  }

  const mitigated = Math.max(0, amount - getEffectiveDefense(card))
  card.currentHp = Math.max(0, card.currentHp - mitigated)
  return mitigated
}

export function isLegend(card: CardInstance): boolean {
  return card.data.type === CardType.Legend
}

export function isSpellCard(card: CardInstance): boolean {
  return card.data.type === CardType.Implant
      || card.data.type === CardType.Overclock
      || card.data.type === CardType.Protocole
}