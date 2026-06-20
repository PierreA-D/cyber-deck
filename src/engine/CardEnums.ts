export const CardType = {
  Warrior   : 'warrior',
  Defender  : 'defender',
  Healer    : 'healer',
  Legend    : 'legend',
  Implant   : 'implant',
  Overclock : 'overclock',
  Protocole : 'protocole',
} as const;

export type CardType = typeof CardType[keyof typeof CardType];

export const TargetType = {
  SingleCard: 'single_card',
  Board: 'board',
  Legend: 'legend',
} as const;

export type TargetType = typeof TargetType[keyof typeof TargetType];

export const TargetSide = {
  Ally: 'ally',
  Enemy: 'enemy',
} as const;

export type TargetSide = typeof TargetSide[keyof typeof TargetSide];

export const TargetMode = {
  Manual: 'manual',
  Auto: 'auto',
} as const;

export type TargetMode = typeof TargetMode[keyof typeof TargetMode];

export const TargetRule = {
  LowestHp: 'lowest_hp',
  HighestAttack: 'highest_attack',
  SelfLegend: 'self_legend',
  Random: 'random',
} as const;

export type TargetRule = typeof TargetRule[keyof typeof TargetRule];

export const EffectType = {
  BuffAttack: 'buff_attack',
  BuffHp: 'buff_hp',
  Heal: 'heal',
  Stun: 'stun',
  DebuffAttack: 'debuff_attack',
  Shield: 'shield',
} as const;

export type EffectType = typeof EffectType[keyof typeof EffectType];

export const DeckColor = {
  Red: 'Red',
  Green: 'Green',
  Blue: 'Blue',
} as const;

export type DeckColor = typeof DeckColor[keyof typeof DeckColor];

export const LegendStance = {
  Active: 'Active',
  Exposed: 'Exposed',
} as const;

export type LegendStance = typeof LegendStance[keyof typeof LegendStance];