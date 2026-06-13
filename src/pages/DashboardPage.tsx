import { useAuth } from '../context/useAuth'
import { useNavigate } from '@tanstack/react-router'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.1),_transparent_34%),linear-gradient(180deg,#050508_0%,#090916_100%)] px-4 py-6 font-mono text-cyan-200 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] tracking-[0.32em] text-rose-400">SYSTEM ACCESS</div>
            <div className="text-3xl tracking-[0.28em] text-cyan-100 md:text-4xl">CYBER_DECK</div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md border border-rose-500/80 bg-transparent px-5 py-3 text-xs tracking-[0.28em] text-rose-300 transition duration-200 hover:bg-rose-500 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-400/70 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            DISCONNECT
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-[0_0_60px_rgba(0,229,255,0.08)] backdrop-blur">
            <div className="mb-6 text-[10px] tracking-[0.32em] text-slate-500">
              IDENTITY
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'USERNAME', value: user?.username },
                { label: 'EMAIL', value: user?.email },
                { label: 'TOTAL WINS', value: user?.totalWins },
                { label: 'WIN STREAK', value: user?.winsStreak },
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <div className="text-[11px] tracking-[0.2em] text-slate-500">
                    {label}
                  </div>
                  <div className="text-sm text-cyan-100">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5 text-sm text-slate-300 backdrop-blur">
              <div className="mb-2 text-[10px] tracking-[0.32em] text-cyan-300">NEXT STEP</div>
              <p>Accède aux combats, explore les decks et prépare ta prochaine partie.</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate({ to: '/game' })}
                className="rounded-md border border-cyan-400/80 bg-transparent px-5 py-4 text-sm tracking-[0.25em] text-cyan-200 transition duration-200 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-300/70 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                ▶ PLAY
              </button>

              <button
                onClick={() => navigate({ to: '/decks' })}
                className="rounded-md border border-amber-400/80 bg-transparent px-5 py-4 text-sm tracking-[0.25em] text-amber-300 transition duration-200 hover:bg-amber-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-300/70 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                ⬡ DECKS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}