import { useNavigate } from '@tanstack/react-router'
import { useProtectedRoute } from '../hooks/useProtectedRoute'
import { useOnlineGame, type OnlinePhase } from '../hooks/useOnlineGame'
import { GameBoard } from '../components/GameBoard'
import type { PlayerInfo } from '../lib/socket'

// Route multijoueur : affiche le lobby de matchmaking tant qu'aucune partie
// n'est en cours, puis bascule sur le plateau partagé une fois l'adversaire trouvé.
export function OnlineGamePage() {
  const { isAuthenticated } = useProtectedRoute()
  const navigate = useNavigate()
  const driver = useOnlineGame()

  if (!isAuthenticated) return null

  const inGame = driver.game && (driver.phase === 'in_game' || driver.phase === 'ended')
  if (inGame) {
    return <GameBoard driver={driver} />
  }

  return (
    <OnlineLobby
      phase={driver.phase}
      error={driver.error}
      opponent={driver.opponent}
      onJoin={driver.join}
      onLeave={driver.leave}
      onBack={() => navigate({ to: '/play' })}
    />
  )
}

interface LobbyProps {
  phase:    OnlinePhase
  error:    string | null
  opponent: PlayerInfo | null
  onJoin:   () => void
  onLeave:  () => void
  onBack:   () => void
}

function OnlineLobby({ phase, error, opponent, onJoin, onLeave, onBack }: LobbyProps) {
  const searching = phase === 'queuing' || phase === 'waiting'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(176,0,255,0.12),_transparent_36%),linear-gradient(180deg,#050508_0%,#090916_100%)] px-4 font-mono text-cyan-200">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(176,0,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(176,0,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-fuchsia-400/30 bg-[#07070e]/80 px-6 py-12 text-center backdrop-blur">
        <div className="text-[10px] tracking-[0.4em] text-fuchsia-300">MULTIPLAYER.LINK</div>

        {phase === 'connecting' && (
          <p className="blink text-sm tracking-[0.3em] text-cyan-300">CONNEXION AU SERVEUR…</p>
        )}

        {phase === 'error' && (
          <>
            <p className="text-sm tracking-[0.2em] text-rose-400">LIAISON ÉCHOUÉE</p>
            <p className="max-w-xs text-[11px] leading-relaxed tracking-[0.1em] text-rose-300/80">
              {error ?? 'Serveur temps réel injoignable.'}
            </p>
          </>
        )}

        {(phase === 'idle') && (
          <>
            <h1 className="text-2xl tracking-[0.25em] text-fuchsia-100">SALLE D'ATTENTE</h1>
            <p className="max-w-xs text-xs leading-relaxed tracking-[0.1em] text-slate-400">
              Lance la recherche pour être associé à un autre joueur.
            </p>
            <button
              onClick={onJoin}
              className="mt-2 w-full rounded-md border border-fuchsia-400/80 bg-transparent px-6 py-4 text-sm tracking-[0.3em] text-fuchsia-200 transition duration-200 hover:bg-fuchsia-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/70"
            >
              ▶ TROUVER UNE PARTIE
            </button>
          </>
        )}

        {searching && (
          <>
            <div className="flex items-center gap-2 text-sm tracking-[0.3em] text-fuchsia-200">
              <span className="blink">■</span> RECHERCHE D'UN ADVERSAIRE…
            </div>
            <div className="h-1 w-40 overflow-hidden rounded-full bg-fuchsia-500/20">
              <div className="anim-neon-pulse h-full w-1/2 rounded-full bg-fuchsia-400" />
            </div>
            {error && <p className="text-[11px] tracking-[0.1em] text-amber-300/80">{error}</p>}
            <button
              onClick={onLeave}
              className="mt-2 text-[11px] tracking-[0.3em] text-slate-400 underline transition hover:text-slate-200"
            >
              ANNULER
            </button>
          </>
        )}

        {phase === 'in_game' && (
          <p className="blink text-sm tracking-[0.3em] text-cyan-300">
            ADVERSAIRE TROUVÉ{opponent ? ` : ${opponent.username}` : ''} — CHARGEMENT…
          </p>
        )}

        <button
          onClick={onBack}
          className="mt-4 rounded-md border border-slate-700 bg-transparent px-6 py-2.5 text-[11px] tracking-[0.3em] text-slate-400 transition duration-200 hover:border-slate-500 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/60"
        >
          ← CHANGER DE MODE
        </button>
      </div>
    </div>
  )
}
