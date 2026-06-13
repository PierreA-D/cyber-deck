import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../context/useAuth'
import { useEffect } from 'react'

export function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate({ to: '/dashboard' })
  }, [isAuthenticated, navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.16),_transparent_38%),linear-gradient(180deg,#050508_0%,#090916_100%)] px-6 font-mono text-cyan-200">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-6 text-center">
        <div className="rounded-full border border-cyan-400/30 bg-cyan-400/5 px-4 py-2 text-[11px] tracking-[0.4em] text-rose-400 shadow-[0_0_24px_rgba(0,229,255,0.15)] backdrop-blur">
          SYSTEM ONLINE // v0.1.0
        </div>

        <h1 className="text-5xl font-normal tracking-[0.35em] text-cyan-100 drop-shadow-[0_0_24px_rgba(0,229,255,0.45)] md:text-7xl">
          CYBER_DECK
        </h1>

        <div className="max-w-2xl text-sm tracking-[0.3em] text-slate-400 md:text-base">
          TACTICAL CARD COMBAT SYSTEM
        </div>

        <div className="flex flex-col gap-4 pt-4 sm:flex-row">
          <button
            onClick={() => navigate({ to: '/login' })}
            className="rounded-md border border-cyan-400/80 bg-transparent px-10 py-4 text-sm tracking-[0.24em] text-cyan-200 transition duration-200 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-300/70 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            LOGIN
          </button>

          <button
            onClick={() => navigate({ to: '/register' })}
            className="rounded-md border border-rose-500/80 bg-transparent px-10 py-4 text-sm tracking-[0.24em] text-rose-300 transition duration-200 hover:bg-rose-500 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-400/70 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            REGISTER
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 text-[11px] tracking-[0.25em] text-slate-500">
        SKOPE_CARD_ENGINE // ALL RIGHTS RESERVED
      </div>
    </div>
  )
}