import type { GameState, CardInstance } from '@cyber-deck/engine'

// Contrat commun consommé par GameBoard, implémenté par le pilote solo
// (useGameEngine) et le pilote en ligne (useOnlineGame). Grâce à cette
// abstraction, le même plateau sert au bot et au multijoueur.
export interface GameDriver {
  game:    GameState | null
  loading: boolean
  error:   string | null

  playCard: (instanceId: string) => void
  swap:     () => void
  heal:     (healerInstanceId: string, targetInstanceId: string) => void
  attack:   (attackerInstanceId: string, targetInstanceId?: string) => void
  endTurn:  () => void
  restart:  () => void
  saveGame: (result: string, turnsCount: number) => Promise<void> | void

  playSpell:                 (instanceId: string) => boolean
  pendingSpell:              CardInstance | null
  resolvePendingSpellTarget: (targetInstanceId: string) => void
  cancelPendingSpell:        () => void

  // Relie l'animation d'attaque (tour IA en solo ; inutilisé en ligne).
  bindAnimator?: (fn: (attackerId: string, targetId: string) => Promise<void>) => void
}
