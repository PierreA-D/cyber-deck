import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/useAuth'
import { useProtectedRoute } from '../hooks/useProtectedRoute'
import { TYPE_STYLE } from '../components/cardStyle'
import { CardPreview } from '../components/CardPreview'
import { createCardInstance, type CardInstance } from '../engine/CardInstance'
import type { CardData } from '../engine/CardData'
import { CardType, DeckColor } from '../engine/CardEnums'

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
      const res = await fetch(`${API}/api/me/cards`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch cards.')
      const all: Card[] = await res.json()
      return all.filter(c => c.color === color && c.type !== 'Legend')
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
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id)
      if (prev.length >= 10) return prev
      return [...prev, id]
    })
  }

  // Adapte les cartes de l'API en instances, uniquement pour alimenter la preview.
  const instances = useMemo<Map<number, CardInstance>>(() => {
    const map = new Map<number, CardInstance>()
    for (const card of cards) {
      const data: CardData = {
        id: String(card.id),
        name: card.name,
        type: card.type.toLowerCase() as CardType,
        color: card.color as DeckColor,
        attack: card.attack,
        maxHp: card.hp,
        healAmount: card.heal,
      }
      map.set(card.id, createCardInstance(data))
    }
    return map
  }, [cards])

  // Preview flottante : survol souris (délai court) ou appui long tactile.
  const [preview, setPreview] = useState<{ card: CardInstance; rect: DOMRect } | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPreviewTimer = () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current)
      previewTimer.current = null
    }
  }
  const schedulePreview = (inst: CardInstance, el: HTMLElement, delay: number) => {
    clearPreviewTimer()
    previewTimer.current = setTimeout(() => {
      setPreview({ card: inst, rect: el.getBoundingClientRect() })
    }, delay)
  }
  const hidePreview = () => {
    clearPreviewTimer()
    setPreview(null)
  }

  useEffect(() => () => clearPreviewTimer(), [])

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
              {Object.values(DeckColor).map(c => (
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
            <p className="text-2xl">{selected.length} <span className="text-sm text-zinc-600">/ 10 CARDS</span></p>
            {selected.length < 10 ? (
              <p className="text-[11px] text-yellow-500 mt-1">
                {10 - selected.length} MORE NEEDED
              </p>
            ) : (
              <p className="text-[11px] text-green-500 mt-1">MAX REACHED — DECK COMPLETE</p>
            )}
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={!name || selected.length !== 10 || createMutation.isPending}
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
              const inst = instances.get(card.id)
              const isSelected = selected.includes(card.id)
              const count = selected.filter(id => id === card.id).length
              const style = TYPE_STYLE[card.type.toLowerCase() as CardType]
              const artUrl = `https://picsum.photos/seed/${card.id}/240/320`
              const locked = !isSelected && selected.length >= 10

              return (
                <div
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  onPointerEnter={e => { if (inst && e.pointerType === 'mouse') schedulePreview(inst, e.currentTarget, 200) }}
                  onPointerLeave={hidePreview}
                  onPointerDown={e => { if (inst && e.pointerType !== 'mouse') schedulePreview(inst, e.currentTarget, 450) }}
                  onPointerMove={e => { if (e.pointerType !== 'mouse') hidePreview() }}
                  onPointerUp={e => { if (e.pointerType !== 'mouse') hidePreview() }}
                  onPointerCancel={hidePreview}
                  style={{
                    borderColor: isSelected ? '#ffffff' : style?.color,
                    boxShadow: isSelected
                      ? `0 0 14px ${style?.color}88`
                      : `0 0 6px ${style?.color}22`,
                  }}
                  className={`relative overflow-hidden border p-4 transition-all ${
                    locked
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer hover:-translate-y-0.5'
                  }`}
                >
                  {/* Illustration en fond + dégradé pour la lisibilité */}
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${artUrl})` }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, rgba(8,8,18,0.5) 0%, rgba(8,8,18,0.2) 40%, rgba(8,8,18,0.85) 100%)' }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0" style={{ background: style?.selBg }} />
                  )}

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm tracking-[1px] text-white">{card.name}</p>
                      {count > 0 && (
                        <span className="text-xs border border-cyan-400 text-cyan-400 px-1 bg-black/60">×{count}</span>
                      )}
                    </div>
                    <p
                      className="text-[10px] tracking-[2px]"
                      style={{ color: style?.color }}
                    >
                      {card.type.toUpperCase()}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-zinc-200">
                      {card.attack !== undefined && <span>⚔ {card.attack}</span>}
                      {card.hp     !== undefined && <span>❤ {card.hp}</span>}
                      {card.heal   !== undefined && <span>💚 {card.heal}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {preview && <CardPreview card={preview.card} anchor={preview.rect} />}
    </div>
  )
}