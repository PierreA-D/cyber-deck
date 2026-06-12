export const CardType = {
  Warrior: 'Warrior',
  Defender: 'Defender',
  Healer: 'Healer',
  Champion: 'Champion',
} as const;

export type CardType = typeof CardType[keyof typeof CardType];

export const DeckColor = {
  Red: 'Red',
  Green: 'Green',
  Blue: 'Blue',
} as const;

export type DeckColor = typeof DeckColor[keyof typeof DeckColor];

export const ChampionStance = {
  Active: 'Active',
  Exposed: 'Exposed',
} as const;

export type ChampionStance = typeof ChampionStance[keyof typeof ChampionStance];