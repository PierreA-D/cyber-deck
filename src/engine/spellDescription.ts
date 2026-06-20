import type { SpellEffect } from './CardData'
import { TargetType, TargetSide, TargetRule, EffectType } from './CardEnums'

// Phrase de l'effet, incluant la préposition « à » quand la cible suit derrière.
function effectPhrase(effect: SpellEffect): string {
  switch (effect.effectType) {
    case EffectType.BuffAttack:   return `Confère +${effect.value} ATK à`
    case EffectType.BuffHp:       return `Confère +${effect.value} PV à`
    case EffectType.Heal:         return `Rend ${effect.value} PV à`
    case EffectType.Stun:         return `Étourdit`
    case EffectType.DebuffAttack: return `Retire ${effect.value} ATK à`
    case EffectType.Shield:       return `Accorde un bouclier de ${effect.value} à`
    default:                      return `Applique un effet à`
  }
}

function scopePhrase(effect: SpellEffect): string {
  const sideSingular = effect.targetSide === TargetSide.Ally ? 'alliée' : 'ennemie'
  const sidePlural   = effect.targetSide === TargetSide.Ally ? 'alliées' : 'ennemies'

  switch (effect.targetType) {
    case TargetType.Board:
      return `toutes les unités ${sidePlural}`
    case TargetType.Legend:
      return `la légende ${sideSingular}`
    case TargetType.SingleCard: {
      switch (effect.targetRule) {
        case TargetRule.LowestHp:      return `1 unité ${sideSingular} (PV les plus bas)`
        case TargetRule.HighestAttack: return `1 unité ${sideSingular} (ATK la plus haute)`
        case TargetRule.Random:        return `1 unité ${sideSingular} (aléatoire)`
        case TargetRule.SelfLegend:    return `votre légende`
        default:                       return `1 unité ${sideSingular} ciblée`
      }
    }
    default:
      return ''
  }
}

// Traduit un SpellEffect en une description lisible (FR).
export function describeSpellEffect(effect: SpellEffect): string {
  const base = `${effectPhrase(effect)} ${scopePhrase(effect)}`.trim()
  if (effect.duration && effect.duration > 0) {
    return `${base} (pendant ${effect.duration} tour${effect.duration > 1 ? 's' : ''})`
  }
  return base
}
