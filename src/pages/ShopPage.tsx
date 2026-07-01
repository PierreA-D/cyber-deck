import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useProtectedRoute } from '../hooks/useProtectedRoute'
import { getAllCards, shuffle } from '../engine/CardDatabase'
import { TYPE_STYLE } from '../components/cardStyle'
import type { CardData } from '../engine/CardData'
import { CardType } from '../engine/CardEnums'
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
  extension: object
}

function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function artUrl(card: CardData): string {
  return card.artKey ?? `https://picsum.photos/seed/${encodeURIComponent(card.id)}/240/320`
}

function rarityLabel(type: CardType): string {
  if (type === CardType.Legend) return 'LEGENDARY'
  if (type === CardType.Healer || type === CardType.Defender) return 'RARE'
  return 'COMMON'
}

function openPack(pack: Pack): CardData[] {
  const all = getAllCards()
  const commonPool = all.filter(c => c.type !== CardType.Legend)
  const result: CardData[] = []

  if (pack.guarantee) {
    const guaranteedPool = all.filter(c => c.type === pack.guarantee)
    if (guaranteedPool.length > 0) {
      result.push(shuffle(guaranteedPool)[0])
    }
  }

  while (result.length < pack.cardCount && commonPool.length > 0) {
    result.push(shuffle(commonPool)[0])
  }

  return shuffle(result)
}

export function ShopPage() {
  useProtectedRoute()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [credits, setCredits] = useState<number>(() => readNumber(CREDITS_KEY, DEFAULT_CREDITS))
  // const [units, setUnits] = useState<number>(() => readNumber(UNITS_KEY, 0))
  const [error, setError] = useState<string | null>(null)
  const [pulled, setPulled] = useState<{ booster: Booster; cards: CardData[] } | null>(null)

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

  const handleBuy = useCallback((booster: Booster) => {
    setError(null)
    if (credits < booster.cost) {
      setError(`FONDS INSUFFISANTS // ${booster.name} REQUIERT ${booster.cost} ₡`)
      return
    }
    const cards = openPack(booster)
    setCredits(prev => prev - booster.cost)
    // setUnits(prev => prev + cards.length)
    setPulled({ booster: booster, cards })
  }, [credits])

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
                        disabled={!affordable}
                        className="rounded-md border px-4 py-2 text-[11px] tracking-[0.24em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                      >
                        {affordable ? 'BUY' : 'LOCKED'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Reveal modal */}
      {pulled && (
        <div
          className="fixed inset-0 z-[13000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setPulled(null)}
        >
          <div
            className="anim-boot flex w-full max-w-3xl flex-col gap-5 rounded-2xl border border-cyan-400/40 bg-[#080812] p-6 shadow-[0_0_60px_rgba(0,229,255,0.2)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-[10px] tracking-[0.32em] text-rose-400">DECRYPTION COMPLETE</div>
                <div className="text-xl tracking-[0.2em] text-cyan-100">{pulled.booster.name}</div>
              </div>
              <button
                onClick={() => setPulled(null)}
                className="rounded-md border border-slate-700 px-4 py-2 text-[11px] tracking-[0.24em] text-slate-400 transition duration-200 hover:border-cyan-400 hover:text-cyan-300"
              >
                CLOSE
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {pulled.cards.map((card, i) => {
                const ts = TYPE_STYLE[card.type]
                return (
                  <div
                    key={`${card.id}-${i}`}
                    className="anim-boot flex flex-col overflow-hidden rounded-sm"
                    style={{
                      animationDelay: `${i * 90}ms`,
                      border: `1px solid ${ts.color}`,
                      boxShadow: `0 0 18px ${ts.color}44`,
                    }}
                  >
                    <div className="relative h-24 overflow-hidden">
                      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${ts.color}22 0%, #0a0a18 65%)` }} />
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${artUrl(card)})` }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,18,0.1) 0%, rgba(8,8,18,0.9) 100%)' }} />
                      <div className="absolute bottom-1 left-1.5 right-1.5">
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-white">
                          {card.name.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 text-[8px] tracking-[0.12em]" style={{ color: ts.color }}>
                      <span>{ts.code}</span>
                      <span>{rarityLabel(card.type)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-[11px] tracking-[0.2em] text-slate-400">
              <span>-{pulled.booster.cost} ₡ // SOLDE {credits.toLocaleString()} ₡</span>
              <button
                onClick={() => setPulled(null)}
                className="rounded-md border border-cyan-400/80 px-6 py-3 text-cyan-200 transition duration-200 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                COLLECT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
