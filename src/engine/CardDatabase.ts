import type { CardData } from './CardData'
import { CardType, DeckColor } from './CardEnums'

const registry: Map<string, CardData> = new Map()

function register(card: CardData): CardData {
  registry.set(card.id, card)
  return card
}

export function getCard(id: string): CardData {
  const card = registry.get(id)
  if (!card) throw new Error(`Card not found: ${id}`)
  return card
}

export function getAllCards(): CardData[] {
  return Array.from(registry.values())
}

// RED
register({ id: 'red_warrior_01',  name: 'Berserker',    type: CardType.Warrior,  color: DeckColor.Red,   attack: 3, maxHp: 2 })
register({ id: 'red_warrior_02',  name: 'Raider',       type: CardType.Warrior,  color: DeckColor.Red,   attack: 2, maxHp: 3 })
register({ id: 'red_defender_01', name: 'Iron Guard',   type: CardType.Defender, color: DeckColor.Red,   attack: 1, maxHp: 4 })
register({ id: 'red_healer_01',   name: 'Field Medic',  type: CardType.Healer,   color: DeckColor.Red,   healAmount: 2 })
register({ id: 'red_champion',    name: 'Warlord',      type: CardType.Champion, color: DeckColor.Red,   attack: 2, maxHp: 5 })

// GREEN
register({ id: 'grn_warrior_01',  name: 'Ranger',       type: CardType.Warrior,  color: DeckColor.Green, attack: 2, maxHp: 3 })
register({ id: 'grn_warrior_02',  name: 'Scout',        type: CardType.Warrior,  color: DeckColor.Green, attack: 1, maxHp: 2 })
register({ id: 'grn_defender_01', name: 'Stone Wall',   type: CardType.Defender, color: DeckColor.Green, attack: 0, maxHp: 6 })
register({ id: 'grn_healer_01',   name: 'Grove Priest', type: CardType.Healer,   color: DeckColor.Green, healAmount: 3 })
register({ id: 'grn_champion',    name: 'Elder Druid',  type: CardType.Champion, color: DeckColor.Green, attack: 1, maxHp: 5 })

// BLUE
register({ id: 'blu_warrior_01',  name: 'Arcanist',     type: CardType.Warrior,  color: DeckColor.Blue,  attack: 2, maxHp: 2 })
register({ id: 'blu_warrior_02',  name: 'Tide Caller',  type: CardType.Warrior,  color: DeckColor.Blue,  attack: 1, maxHp: 4 })
register({ id: 'blu_defender_01', name: 'Coral Shield', type: CardType.Defender, color: DeckColor.Blue,  attack: 1, maxHp: 5 })
register({ id: 'blu_healer_01',   name: 'Sea Oracle',   type: CardType.Healer,   color: DeckColor.Blue,  healAmount: 2 })
register({ id: 'blu_champion',    name: 'Storm Admiral',type: CardType.Champion, color: DeckColor.Blue,  attack: 2, maxHp: 5 })

export function generateDeck(color: DeckColor): CardData[] {
  const pool = getAllCards().filter(
    c => c.color === color && c.type !== CardType.Champion
  )
  const warriors  = pool.filter(c => c.type === CardType.Warrior)
  const defenders = pool.filter(c => c.type === CardType.Defender)
  const healers   = pool.filter(c => c.type === CardType.Healer)

  const deck: CardData[] = [
    ...repeatToFill(warriors,  8),
    ...repeatToFill(defenders, 6),
    ...repeatToFill(healers,   6),
  ]
  return shuffle(deck)
}

function repeatToFill(pool: CardData[], count: number): CardData[] {
  const result: CardData[] = []
  for (let i = 0; i < count; i++) {
    result.push(pool[i % pool.length])
  }
  return result
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function getChampion(color: DeckColor): CardData {
  const champion = getAllCards().find(
    c => c.color === color && c.type === CardType.Champion
  )
  if (!champion) throw new Error(`No champion found for color: ${color}`)
  return champion
}