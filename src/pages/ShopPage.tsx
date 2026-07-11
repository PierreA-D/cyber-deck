import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useProtectedRoute } from '../hooks/useProtectedRoute'
import { resolveDeckCard, type DeckCard } from '../engine/CardDatabase'
import { BoosterReveal } from '../components/BoosterReveal'
import type { CardData } from '../engine/CardData'
import { useAuth } from '../context/useAuth'

const CREDITS_KEY = 'cyber_credits'
// const UNITS_KEY = 'cyber_units_owned'
const DEFAULT_CREDITS = 800
const RECHARGE_AMOUNT = 500

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

interface Booster {
  id: string
  name: string
  cost: number
  code?: string
  extension: object
}

function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

// POST /api/boosters/{id}/open : l'ouverture (tirage + débit) est gérée côté serveur.
// On récupère les cartes tirées et, si fourni, le nouveau solde.
async function openBooster(
  boosterId: string,
  token: string | null,
): Promise<{ cards: CardData[]; balance: number | null }> {
  const res = await fetch(`${API}/api/boosters/${encodeURIComponent(boosterId)}/open`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`OUVERTURE REFUSÉE // CODE ${res.status}`)

  const data = await res.json()
  const rawCards: unknown = Array.isArray(data) ? data : data?.cards ?? []
  const cards = (Array.isArray(rawCards) ? rawCards : []).map(c => resolveDeckCard(c as DeckCard))
  const balance =
    typeof data?.balance === 'number' ? data.balance
    : typeof data?.credits === 'number' ? data.credits
    : null

  return { cards, balance }
}

export function ShopPage() {
  useProtectedRoute()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [credits, setCredits] = useState<number>(() => readNumber(CREDITS_KEY, DEFAULT_CREDITS))
  // const [units, setUnits] = useState<number>(() => readNumber(UNITS_KEY, 0))
  const [error, setError] = useState<string | null>(null)
  const [pulled, setPulled] = useState<{ booster: Booster; cards: CardData[] | null } | null>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const [boosters,   setBoosters]   = useState<any>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBoosters() {
      try {
        const res = await fetch(`${API}/api/boosters`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch boosters.')
        const data = await res.json()
        setBoosters(data)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to fetch boosters.')
      } finally {
        setLoading(false)
      }
    }

    async function fetchBalance() {
      try {
        const res = await fetch(`${API}/api/me/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch balance.')
        const data = await res.json()
        setCredits(data.balance)
        // setUnits(0)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to fetch balance.')
      } finally {
        setLoading(false)
      }
    }

    fetchBoosters()
    fetchBalance()
  }, [token])

  const handleBuy = useCallback(async (booster: Booster) => {
    setError(null)
    if (buyingId) return
    if (credits < booster.cost) {
      setError(`FONDS INSUFFISANTS // ${booster.name} REQUIERT ${booster.cost} ₡`)
      return
    }
    setBuyingId(booster.id)
    setPulled({ booster, cards: null })
    try {
      const { cards, balance } = await openBooster(booster.id, token)
      setCredits(prev => (balance ?? prev - booster.cost))
      setPulled({ booster, cards })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Échec de l'ouverture du booster.")
      setPulled(null)
    } finally {
      setBuyingId(null)
    }
  }, [buyingId, credits, token])

  function handleRecharge() {
    setError(null)
    setCredits(prev => prev + RECHARGE_AMOUNT)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.1),_transparent_34%),linear-gradient(180deg,#050508_0%,#090916_100%)] px-4 py-6 font-mono text-cyan-200 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] tracking-[0.32em] text-rose-400">BLACK MARKET // UPLINK</div>
            <div className="text-3xl tracking-[0.28em] text-cyan-100 md:text-4xl">SHOP</div>
          </div>
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="rounded-md border border-slate-700 bg-transparent px-5 py-3 text-xs tracking-[0.28em] text-slate-400 transition duration-200 hover:border-cyan-400 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            ← BACK
          </button>
        </div>

        {/* Wallet */}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/5 px-6 py-5 backdrop-blur">
            <div>
              <div className="text-[10px] tracking-[0.32em] text-cyan-300">CREDIT BALANCE</div>
              <div className="anim-neon-pulse text-3xl tracking-[0.18em] text-cyan-400">
                {credits} ₡
              </div>
            </div>
            {/* <div className="hidden h-10 w-px bg-slate-700 sm:block" /> */}
            {/* <div>
              <div className="text-[10px] tracking-[0.32em] text-slate-500">UNITS OWNED</div>
              <div className="text-3xl tracking-[0.18em] text-amber-300">{units}</div>
            </div> */}
          </div>
          <button
            onClick={handleRecharge}
            className="rounded-md border border-emerald-400/70 bg-transparent px-6 py-4 text-xs tracking-[0.26em] text-emerald-300 transition duration-200 hover:bg-emerald-400 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            + RECHARGE {RECHARGE_AMOUNT} ₡
          </button>
        </div>

        {error && (
          <div className="anim-log-reveal rounded-md border border-rose-500/70 bg-rose-500/10 px-5 py-3 text-xs tracking-[0.2em] text-rose-300">
            {error}
          </div>
        )}

        {/* Packs grid */}
        <div>
          <div className="mb-5 text-[10px] tracking-[0.32em] text-slate-500">DATA BOOSTER</div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {boosters.map(booster => {
              const affordable = credits >= booster.cost
              return (
                <div
                  key={booster.id}
                  className="anim-boot flex flex-col overflow-hidden rounded-2xl border bg-slate-950/70 backdrop-blur transition duration-200"
                >
                  {/* Pack art */}
                  <div className="relative h-36 overflow-hidden">
                    <div
                      className="absolute inset-0"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:22px_22px]" />
                    <div
                      className="absolute right-3 top-3 rounded-full border px-2 py-1 text-[9px] tracking-[0.2em]"
                    >
                      5 CARDS
                    </div>
                    <div className="absolute bottom-2 left-3 text-[9px] tracking-[0.3em]">
                      {booster.code}
                    </div>
                  </div>

                  {/* Pack body */}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="text-lg tracking-[0.18em] text-slate-100">{booster.name}</div>
                    <p className="flex-1 text-[11px] leading-relaxed text-slate-400">{booster.tagline}</p>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xl tracking-[0.12em]">
                        {booster.cost} ₡
                      </div>
                      <button
                        onClick={() => handleBuy(booster)}
                        disabled={!affordable || buyingId !== null}
                        className="rounded-md border px-4 py-2 text-[11px] tracking-[0.24em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                      >
                        {buyingId === booster.id ? 'OPENING…' : affordable ? 'BUY' : 'LOCKED'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Reveal booster 3D */}
      {pulled && (
        <BoosterReveal
          boosterName={pulled.booster.name}
          code={pulled.booster.code}
          cost={pulled.booster.cost}
          balance={credits}
          cards={pulled.cards}
          onClose={() => setPulled(null)}
        />
      )}
    </div>
  )
}
