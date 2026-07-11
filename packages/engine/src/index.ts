// Point d'entrée public du moteur partagé (front + serveur).
// Aucune dépendance navigateur/réseau ici : tout est pur et portable.
export * from './CardEnums'
export * from './CardData'
export * from './CardInstance'
export * from './GameEngine'
export * from './CardDatabase'
export * from './MatchSetup'
export * from './spellDescription'
export * from './AIPlayer'

// PlayerState est réexporté explicitement : son `endTurn` (niveau joueur)
// entre en conflit de nom avec le `endTurn` (niveau match) de GameEngine.
export type { PlayerState } from './PlayerState'
export {
  HAND_SIZE, LEGEND_MAX_HP, DECK_SIZE,
  createPlayerState, drawFromActiveDeck, drawCard,
  playSwap, playSpellCard, playCardToBoard, discardFromBoard,
  isDefeated,
  endTurn as endPlayerTurn,
} from './PlayerState'
