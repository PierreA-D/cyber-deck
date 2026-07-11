import { CardType, DeckColor, TargetType, TargetSide, TargetMode, TargetRule, EffectType } from './CardEnums'

export interface SpellEffect {
  targetType: TargetType
  targetSide: TargetSide
  targetMode: TargetMode
  targetRule?: TargetRule
  effectType: EffectType
  value: number
  duration?: number
}

export interface CardData {
  id: string
  name: string
  type: CardType
  color: DeckColor
  attack?: number
  maxHp?: number
  healAmount?: number
  description?: string
  artKey?: string
  spellEffect?: SpellEffect
}
