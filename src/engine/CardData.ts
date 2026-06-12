import { CardType, DeckColor } from './CardEnums'

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
}

export const SWAP_CARD: CardData = {
  id: 'swap',
  name: 'Swap',
  type: CardType.Warrior,
  color: DeckColor.Red,
  description: 'Exchange your active deck with your passive deck.',
}