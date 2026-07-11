import { useNavigate } from '@tanstack/react-router'
import { useProtectedRoute } from '../hooks/useProtectedRoute'

export function PlayModePage() {
  const { isAuthenticated } = useProtectedRoute()
  const navigate = useNavigate()

  if (!isAuthenticated) return null

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.1),_transparent_34%),linear-gradient(180deg,#050508_0%,#090916_100%)] px-4 py-10 font-mono text-cyan-200 sm:py-16">
      {/* Grille de fond */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-10">
        <div className="text-center">
          <div className="text-[10px] tracking-[0.4em] text-rose-400">SELECT.PROTOCOL</div>
          <h1 className="mt-2 text-3xl tracking-[0.3em] text-cyan-100 sm:text-4xl">MODE DE JEU</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* VS BOT */}
          <button
            onClick={() => navigate({ to: '/game' })}
            className="group flex flex-col items-center gap-4 rounded-2xl border border-cyan-400/50 bg-cyan-400/[0.04] px-6 py-10 text-center transition duration-200 hover:-translate-y-1 hover:border-cyan-300 hover:bg-cyan-400/10 hover:shadow-[0_0_40px_rgba(0,229,255,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
          >
            <span className="text-5xl">🤖</span>
            <span className="text-xl tracking-[0.25em] text-cyan-100">VS BOT</span>
            <p className="text-xs leading-relaxed tracking-[0.1em] text-slate-400">
              Affronte l'IA en solo.<br />Instantané, hors-ligne.
            </p>
            <span className="mt-2 text-[11px] tracking-[0.3em] text-cyan-300 group-hover:text-cyan-100">
              INITIALISER ▶
            </span>
          </button>

          {/* MULTIJOUEUR */}
          <button
            onClick={() => navigate({ to: '/play/online' })}
            className="group flex flex-col items-center gap-4 rounded-2xl border border-fuchsia-400/50 bg-fuchsia-400/[0.04] px-6 py-10 text-center transition duration-200 hover:-translate-y-1 hover:border-fuchsia-300 hover:bg-fuchsia-400/10 hover:shadow-[0_0_40px_rgba(176,0,255,0.25)] focus:outline-none focus:ring-2 focus:ring-fuchsia-300/70"
          >
            <span className="text-5xl">🌐</span>
            <span className="text-xl tracking-[0.25em] text-fuchsia-100">MULTIJOUEUR</span>
            <p className="text-xs leading-relaxed tracking-[0.1em] text-slate-400">
              Défie un autre joueur<br />en temps réel.
            </p>
            <span className="mt-2 text-[11px] tracking-[0.3em] text-fuchsia-300 group-hover:text-fuchsia-100">
              SE CONNECTER ▶
            </span>
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="rounded-md border border-slate-700 bg-transparent px-6 py-3 text-xs tracking-[0.3em] text-slate-400 transition duration-200 hover:border-slate-500 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/60"
          >
            ← RETOUR
          </button>
        </div>
      </div>
    </div>
  )
}
