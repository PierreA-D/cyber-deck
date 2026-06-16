import { type CardData, SWAP_CARD } from './CardData'
import {  type CardInstance, createCardInstance, isSwapCard } from './CardInstance'
import { CardType } from './CardEnums'

export const HAND_SIZE       = 4
export const CHAMPION_MAX_HP = 5
export const DECK_SIZE       = 20

export interface PlayerState {
  readonly playerId: string

  activeDeck:  CardInstance[]
  passiveDeck: CardInstance[]
  hand:        CardInstance[]
  board:       CardInstance[]
  discard:     CardInstance[]

  champion: CardInstance

  hasSwappedThisTurn: boolean
}

export function createPlayerState(
  playerId: string,
  deckA: CardData[],
  deckB: CardData[],
  championData: CardData,
): PlayerState {
  const champion = createCardInstance({
    ...championData,
    type: CardType.Champion,
    maxHp: CHAMPION_MAX_HP,
  })

  const state: PlayerState = {
    playerId,
    activeDeck:  deckA.map(createCardInstance),
    passiveDeck: deckB.map(createCardInstance),
    hand:    [],
    board:   [],
    discard: [],
    champion,
    hasSwappedThisTurn: false,
  }

  drawOpeningHand(state)
  return state
}

function drawOpeningHand(state: PlayerState): void {
  state.hand.push(createCardInstance(SWAP_CARD))
  for (let i = 0; i < HAND_SIZE - 1; i++) {
    const drawn = drawFromActiveDeck(state)
    if (drawn) state.hand.push(drawn)
  }
}

export function drawFromActiveDeck(state: PlayerState): CardInstance | null {
  if (state.activeDeck.length === 0) return null
  const [top, ...rest] = state.activeDeck
  state.activeDeck = rest
  return top
}

export function drawCard(state: PlayerState): 'drawn' | 'deck_empty' | 'hand_full' {
  if (state.hand.length >= HAND_SIZE) return 'hand_full'
  const card = drawFromActiveDeck(state)
  if (!card) return 'deck_empty'
  state.hand.push(card)
  return 'drawn'
}

export function playSwap(state: PlayerState): 'ok' | 'already_swapped' | 'no_swap_card' {
  if (state.hasSwappedThisTurn) return 'already_swapped'

  const swapIndex = state.hand.findIndex(isSwapCard)
  if (swapIndex === -1) return 'no_swap_card'

  const [swapCard] = state.hand.splice(swapIndex, 1)
  state.discard.push(swapCard)

  const temp        = state.activeDeck
  state.activeDeck  = state.passiveDeck
  state.passiveDeck = temp

  state.hasSwappedThisTurn = true
  return 'ok'
}

export function playCardToBoard(
  state: PlayerState,
  instanceId: string,
): 'ok' | 'not_in_hand' | 'is_swap_card' {
  const idx = state.hand.findIndex(c => c.instanceId === instanceId)
  if (idx === -1) return 'not_in_hand'

  const card = state.hand[idx]
  if (isSwapCard(card)) return 'is_swap_card'

  state.hand.splice(idx, 1)
  state.board.push(card)
  return 'ok'
}

export function discardFromBoard(state: PlayerState, instanceId: string): boolean {
  const idx = state.board.findIndex(c => c.instanceId === instanceId)
  if (idx === -1) return false
  const [dead] = state.board.splice(idx, 1)
  state.discard.push(dead)
  return true
}

export function endTurn(state: PlayerState): 'drawn' | 'deck_empty' | 'hand_full' {
  state.hasSwappedThisTurn = false
  for (const card of state.board) {
    card.isExhausted = false
  }
  return drawCard(state)
}

export function isDefeated(state: PlayerState): boolean {
  return (
    state.champion.currentHp <= 0 ||
    (state.activeDeck.length === 0 && state.hand.length === 0)
  )
}