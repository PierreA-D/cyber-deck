import { useGameEngine } from '../hooks/useGameEngine'
import { useProtectedRoute } from '../hooks/useProtectedRoute'
import { GameBoard } from '../components/GameBoard'

// Partie solo contre le bot : le pilote local (moteur + IA) alimente le plateau.
export function SoloGamePage() {
  const { isAuthenticated } = useProtectedRoute()
  const driver = useGameEngine()

  if (!isAuthenticated) return null
  return <GameBoard driver={driver} />
}
