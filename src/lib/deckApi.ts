import type { Deck } from '@cyber-deck/engine'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

// Récupère les decks actifs du joueur connecté (couche réseau, côté client).
export async function getDeckActive(token: string): Promise<Deck[]> {
  const res = await fetch(`${API}/api/decks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch decks.')
  const data: Deck[] = await res.json()
  return data.filter(deck => deck.isActive)
}
