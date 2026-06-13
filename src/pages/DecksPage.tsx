import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../context/useAuth'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

interface Card {
  id: number
  name: string
  type: string
  color: string
}

interface Deck {
  id: number
  name: string
  color: string
  isActive: boolean
  createdAt: string
  cards: Card[]
}

export function DecksPage() {
  const { token } = useAuth()
  const navigate  = useNavigate()

  const [decks,   setDecks]   = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function fetchDecks() {
      try {
        const res = await fetch(`${API}/api/decks`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch decks.')
        const data = await res.json()
        setDecks(data)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to fetch decks.')
      } finally {
        setLoading(false)
      }
    }

    fetchDecks()
  }, [token])

  async function handleDelete(id: number) {
    if (!confirm('Delete this deck?')) return
    await fetch(`${API}/api/decks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setDecks(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-mono text-cyan-400 p-10">

      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-5 mb-10">
        <div>
          <p className="text-[10px] tracking-[3px] text-red-500">DECK MANAGEMENT</p>
          <h1 className="text-2xl tracking-[4px]">MY DECKS</h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate({ to: '/decks/new' })}
            className="px-6 py-2 border border-cyan-400 text-cyan-400 text-xs tracking-[2px] hover:bg-cyan-400 hover:text-[#0a0a0f] transition-all"
          >
            + NEW DECK
          </button>
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="px-6 py-2 border border-zinc-700 text-zinc-500 text-xs tracking-[2px] hover:border-zinc-500 transition-all"
          >
            ← BACK
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <p className="text-zinc-600 tracking-[2px] text-sm">LOADING...</p>
      )}

      {error && (
        <div className="border border-red-500 text-red-500 p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && decks.length === 0 && (
        <div className="border border-zinc-800 p-12 text-center">
          <p className="text-zinc-600 tracking-[2px] text-sm mb-6">NO DECKS FOUND</p>
          <button
            onClick={() => navigate({ to: '/decks/new' })}
            className="px-8 py-3 border border-cyan-400 text-cyan-400 text-xs tracking-[2px] hover:bg-cyan-400 hover:text-[#0a0a0f] transition-all"
          >
            CREATE YOUR FIRST DECK
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map(deck => (
          <div key={deck.id} className="border border-zinc-800 p-6 hover:border-cyan-400 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs tracking-[2px] text-zinc-600 mb-1">{deck.color.toUpperCase()}</p>
                <h3 className="text-lg tracking-[2px]">{deck.name}</h3>
              </div>
              {deck.isActive && (
                <span className="text-[10px] tracking-[2px] text-cyan-400 border border-cyan-400 px-2 py-1">
                  ACTIVE
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-600 mb-6">
              {deck.cards.length} CARDS
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => navigate({ to: `/decks/${deck.id}` })}
                className="flex-1 py-2 border border-zinc-700 text-zinc-400 text-xs tracking-[2px] hover:border-cyan-400 hover:text-cyan-400 transition-all"
              >
                EDIT
              </button>
              <button
                onClick={() => handleDelete(deck.id)}
                className="px-4 py-2 border border-zinc-700 text-zinc-600 text-xs hover:border-red-500 hover:text-red-500 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}