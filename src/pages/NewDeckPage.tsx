import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/useAuth'
import { useProtectedRoute } from '../hooks/useProtectedRoute'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

interface Card {
  id: number
  name: string
  type: string
  color: string
  attack?: number
  hp?: number
  heal?: number
}

export function NewDeckPage() {
  useProtectedRoute()
  const { token } = useAuth()
  const navigate  = useNavigate()

  const [name,     setName]     = useState('')
  const [color,    setColor]    = useState('Red')
  const [isActive, setIsActive] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [error,    setError]    = useState<string | null>(null)

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards', color],
    queryFn: async () => {
      const res = await fetch(`${API}/api/cards`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch cards.')
      const all: Card[] = await res.json()
      return all.filter(c => c.color === color && c.type !== 'Champion')
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/decks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color, isActive, cardIds: selected }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create deck.')
      }
      return res.json()
    },
    onSuccess: () => navigate({ to: '/decks' }),
    onError: (e: Error) => setError(e.message),
  })

  function toggleCard(id: number) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const TYPE_COLORS: Record<string, string> = {
    WARRIOR:  'text-red-400 border-red-900',
    DEFENDER: 'text-blue-400 border-blue-900',
    HEALER:   'text-green-400 border-green-900',
    CHAMPION: 'text-yellow-400 border-yellow-900',
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-mono text-cyan-400 p-10">

      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-5 mb-10">
        <div>
          <p className="text-[10px] tracking-[3px] text-red-500">DECK BUILDER</p>
          <h1 className="text-2xl tracking-[4px]">NEW DECK</h1>
        </div>
        <button
          onClick={() => navigate({ to: '/decks' })}
          className="px-6 py-2 border border-zinc-700 text-zinc-500 text-xs tracking-[2px] hover:border-zinc-500 transition-all"
        >
          ← BACK
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* Left — Config */}
        <div className="flex flex-col gap-6">
          {error && (
            <div className="border border-red-500 text-red-500 p-4 text-sm">{error}</div>
          )}

          <div>
            <p className="text-[11px] tracking-[2px] text-zinc-600 mb-2">DECK NAME</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-transparent border border-zinc-700 text-cyan-400 p-3 font-mono text-sm outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <p className="text-[11px] tracking-[2px] text-zinc-600 mb-2">COLOR</p>
            <div className="flex gap-3">
              {['Red', 'Green', 'Blue'].map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setSelected([]) }}
                  className={`flex-1 py-2 border text-xs tracking-[2px] transition-all ${
                    color === c
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="accent-cyan-400"
            />
            <label htmlFor="isActive" className="text-xs tracking-[2px] text-zinc-400">
              SET AS ACTIVE DECK
            </label>
          </div>

          <div className="border border-zinc-800 p-4">
            <p className="text-[11px] tracking-[2px] text-zinc-600 mb-2">SELECTED</p>
            <p className="text-2xl">{selected.length} <span className="text-sm text-zinc-600">/ 20 CARDS</span></p>
            {selected.length < 20 && (
              <p className="text-[11px] text-yellow-500 mt-1">
                {20 - selected.length} MORE NEEDED
              </p>
            )}
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={!name || selected.length !== 20 || createMutation.isPending}
            className="py-4 border border-cyan-400 text-cyan-400 text-sm tracking-[3px] hover:bg-cyan-400 hover:text-[#0a0a0f] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'SAVING...' : 'SAVE DECK'}
          </button>
        </div>

        {/* Right — Card picker */}
        <div>
          <p className="text-[11px] tracking-[2px] text-zinc-600 mb-4">
            AVAILABLE CARDS — {color.toUpperCase()}
          </p>

          {isLoading && <p className="text-zinc-600 text-sm">LOADING...</p>}

          <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
            {cards.map(card => {
              const isSelected = selected.includes(card.id)
              const count      = selected.filter(id => id === card.id).length

              return (
                <div
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  className={`border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-400/5'
                      : 'border-zinc-800 hover:border-zinc-600'
                  } ${TYPE_COLORS[card.type] ?? ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm tracking-[1px]">{card.name}</p>
                    {count > 0 && (
                      <span className="text-xs border border-cyan-400 text-cyan-400 px-1">
                        ×{count}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] tracking-[2px] opacity-60">{card.type.toUpperCase()}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    {card.attack !== undefined && <span>⚔ {card.attack}</span>}
                    {card.hp     !== undefined && <span>❤ {card.hp}</span>}
                    {card.heal   !== undefined && <span>💚 {card.heal}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}