import type { CardData } from './CardData'
import { CardType, DeckColor } from './CardEnums'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export interface DeckCard {
  id: number | string
  cardId?: string
  card_id?: string
  card?: {
    id?: string
  }
  name: string
  type: string
  color: string
  description?: string
  attack?: number
  maxHp?: number
  healAmount?: number
}

export interface Deck {
  id: number
  name: string
  color: string
  isActive: boolean
  createdAt: string
  cards: DeckCard[]
}

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

function normalizeCardType(type: string): CardType {
  const lower = type.toLowerCase()
  if (lower === 'warrior') return CardType.Warrior
  if (lower === 'defender') return CardType.Defender
  if (lower === 'healer') return CardType.Healer
  if (lower === 'legend') return CardType.Legend
  return CardType.Warrior
}

function normalizeDeckColor(color: string): DeckColor {
  const lower = color.toLowerCase()
  if (lower === 'red') return DeckColor.Red
  if (lower === 'green') return DeckColor.Green
  if (lower === 'blue') return DeckColor.Blue
  return DeckColor.Red
}

function buildApiCardId(deckCard: DeckCard): string {
  if (deckCard.id === undefined || deckCard.id === null) {
    throw new Error('API card is missing its id')
  }
  return `api_${String(deckCard.id)}`
}

export function resolveDeckCard(deckCard: DeckCard): CardData {
  const directId = deckCard.cardId ?? deckCard.card_id ?? deckCard.card?.id
  if (directId) {
    try {
      return getCard(directId)
    } catch {
      // Continue with payload-based fallback when API id is not in local registry.
    }
  }

  const fallback = getAllCards().find(c => (
    c.name.toLowerCase() === deckCard.name.toLowerCase()
    && c.type.toLowerCase() === deckCard.type.toLowerCase()
    && c.color.toLowerCase() === deckCard.color.toLowerCase()
  ))

  if (fallback) return fallback

  const type = normalizeCardType(deckCard.type)
  return {
    id: buildApiCardId(deckCard),
    name: deckCard.name,
    type,
    color: normalizeDeckColor(deckCard.color),
    description: deckCard.description,
    attack: deckCard.attack ?? (type === CardType.Warrior ? 2 : type === CardType.Defender ? 1 : type === CardType.Legend ? 2 : undefined),
    maxHp: deckCard.maxHp ?? (type === CardType.Warrior ? 3 : type === CardType.Defender ? 5 : type === CardType.Legend ? 5 : undefined),
    healAmount: deckCard.healAmount ?? (type === CardType.Healer ? 2 : undefined),
  }
}

export function getAllCards(): CardData[] {
  return Array.from(registry.values())
}

// RED
register({ id: 'red_warrior_01',  name: 'Berserker',    type: CardType.Warrior,  color: DeckColor.Red,   attack: 3, maxHp: 2 })
register({ id: 'red_warrior_02',  name: 'Raider',       type: CardType.Warrior,  color: DeckColor.Red,   attack: 2, maxHp: 3 })
register({ id: 'red_defender_01', name: 'Iron Guard',   type: CardType.Defender, color: DeckColor.Red,   attack: 1, maxHp: 4 })
register({ id: 'red_healer_01',   name: 'Field Medic',  type: CardType.Healer,   color: DeckColor.Red,   healAmount: 2 })
register({ id: 'red_legend',      name: 'Warlord',      type: CardType.Legend,  color: DeckColor.Red,   attack: 2, maxHp: 5 })

// GREEN
register({ id: 'grn_warrior_01',  name: 'Ranger',       type: CardType.Warrior,  color: DeckColor.Green, attack: 2, maxHp: 3 })
register({ id: 'grn_warrior_02',  name: 'Scout',        type: CardType.Warrior,  color: DeckColor.Green, attack: 1, maxHp: 2 })
register({ id: 'grn_defender_01', name: 'Stone Wall',   type: CardType.Defender, color: DeckColor.Green, attack: 0, maxHp: 6 })
register({ id: 'grn_healer_01',   name: 'Grove Priest', type: CardType.Healer,   color: DeckColor.Green, healAmount: 3 })
register({ id: 'grn_legend',      name: 'Elder Druid',  type: CardType.Legend,  color: DeckColor.Green, attack: 1, maxHp: 5 })

// BLUE
register({ id: 'blu_warrior_01',  name: 'Arcanist',     type: CardType.Warrior,  color: DeckColor.Blue,  attack: 2, maxHp: 2 })
register({ id: 'blu_warrior_02',  name: 'Tide Caller',  type: CardType.Warrior,  color: DeckColor.Blue,  attack: 1, maxHp: 4 })
register({ id: 'blu_defender_01', name: 'Coral Shield', type: CardType.Defender, color: DeckColor.Blue,  attack: 1, maxHp: 5 })
register({ id: 'blu_healer_01',   name: 'Sea Oracle',   type: CardType.Healer,   color: DeckColor.Blue,  healAmount: 2 })
register({ id: 'blu_legend',      name: 'Storm Admiral',type: CardType.Legend,  color: DeckColor.Blue,  attack: 2, maxHp: 5 })

export function generateDeck(color: DeckColor): CardData[] {
  const pool = getAllCards().filter(
    c => c.color === color && c.type !== CardType.Legend
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

export async function getDeckActive(token: string): Promise<Deck[]> {
  const res = await fetch(`${API}/api/decks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch decks.')
  const data: Deck[] = await res.json()
  return data.filter(deck => deck.isActive)
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

export function getLegend(color: DeckColor): CardData {
  const legend = getAllCards().find(
    c => c.color === color && c.type === CardType.Legend
  )
  if (!legend) throw new Error(`No legend found for color: ${color}`)
  return legend
}