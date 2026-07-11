import type { Deck } from '@cyber-deck/engine'
import { env } from './env'

// Récupère les decks actifs d'un joueur depuis le backend REST (auth via JWT).
export async function fetchActiveDecks(token: string): Promise<Deck[]> {
  const res = await fetch(`${env.BACKEND_URL}/api/decks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Impossible de récupérer les decks.')
  const data = (await res.json()) as Deck[]
  return data.filter((deck) => deck.isActive)
}

// Enregistre le résultat d'une partie (best-effort, n'interrompt jamais le flux).
export async function saveGameResult(token: string, result: string, turnsCount: number): Promise<void> {
  try {
    await fetch(`${env.BACKEND_URL}/api/games`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, turnsCount }),
    })
  } catch (e) {
    console.error('[decks] saveGameResult a échoué:', e)
  }
}
