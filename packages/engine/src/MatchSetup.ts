import type { Deck } from './CardDatabase'
import { resolveDeckCard, shuffle } from './CardDatabase'
import { createPlayerState, type PlayerState } from './PlayerState'

// Construit l'état d'un joueur à partir de ses 2 decks actifs.
// Règles partagées solo + multi : exactement 2 decks actifs et 1 seul champion
// (legend) réparti sur l'ensemble. Le reste alimente les decks actif/passif.
export function buildPlayerFromActiveDecks(playerId: string, activeDecks: Deck[]): PlayerState {
  if (activeDecks.length < 2) {
    throw new Error('You need exactly 2 active decks to play.')
  }

  const sourceA = activeDecks[0].cards
  const sourceB = activeDecks[1].cards

  const isLegend = (c: Deck['cards'][number]) => c.type.toLowerCase() === 'legend'

  const legends = [...sourceA, ...sourceB].filter(isLegend)
  if (legends.length === 0) throw new Error('You need exactly 1 legend across your decks.')
  if (legends.length > 1) throw new Error('You can only have 1 legend across your decks.')

  const deckA = sourceA.filter(c => !isLegend(c)).map(resolveDeckCard)
  const deckB = sourceB.filter(c => !isLegend(c)).map(resolveDeckCard)
  const legend = resolveDeckCard(legends[0])

  return createPlayerState(playerId, shuffle(deckA), shuffle(deckB), legend)
}
