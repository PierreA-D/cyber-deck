import type { CardData } from './CardData'
import { CardType } from './CardEnums'

export interface CardInstance {
  readonly instanceId: string
  readonly data: CardData

  currentHp: number
  attackBuff: number
  defenseBuff: number
  isExhausted: boolean
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
  const mitigated = Math.max(0, amount - getEffectiveDefense(card))
  card.currentHp = Math.max(0, card.currentHp - mitigated)
  return mitigated
}

export function isChampion(card: CardInstance): boolean {
  return card.data.type === CardType.Champion
}