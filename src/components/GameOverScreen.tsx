import { useNavigate } from '@tanstack/react-router'
import type { GameResult } from '@cyber-deck/engine'

interface GameOverScreenProps {
  result: GameResult
  turn: number
  onReplay: () => void
}

type Outcome = 'player_wins' | 'enemy_wins' | 'draw'

interface Theme {
  title:      string
  subtitle:   string
  tag:        string
  accent:     string
  rgb:        string
  titleClass: string
}

const THEMES: Record<Outcome, Theme> = {
  player_wins: {
    title:      'VICTORY',
    subtitle:   '// CONNECTION_SECURED',
    tag:        'SYSTEM.RESTORED',
    accent:     '#00e5ff',
    rgb:        '0,229,255',
    titleClass: 'anim-result-glow',
  },
  enemy_wins: {
    title:      'DEFEAT',
    subtitle:   '// SYSTEM_BREACH',
    tag:        'FATAL.ERROR',
    accent:     '#ff0060',
    rgb:        '255,0,96',
    titleClass: 'anim-defeat-glitch',
  },
  draw: {
    title:      'STALEMATE',
    subtitle:   '// MUTUAL_SHUTDOWN',
    tag:        'SIGNAL.LOST',
    accent:     '#ffe000',
    rgb:        '255,224,0',
    titleClass: 'anim-result-glow',
  },
}

export function GameOverScreen({ result, turn, onReplay }: GameOverScreenProps) {
  const navigate = useNavigate()

  if (result.status === 'ongoing') return null

  const outcome   = result.status
  const theme     = THEMES[outcome]
  const isVictory = outcome === 'player_wins'

  return (
    <div
      role="alertdialog"
      aria-label={`Game over: ${theme.title}`}
      className="anim-overlay-in fixed inset-0 z-[13000] flex items-center justify-center overflow-hidden bg-[#050508]/85 px-4 backdrop-blur-sm"
    >
      {/* Vignette colorée */}
      <div
        className="anim-vignette pointer-events-none absolute inset-0 z-0"
        style={{
          background: `radial-gradient(circle at 50% 42%, rgba(${theme.rgb},0.16) 0%, transparent 55%), radial-gradient(circle at 50% 118%, rgba(${theme.rgb},0.12) 0%, transparent 60%)`,
        }}
      />

      {/* Grille de fond */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />

      {/* Scanlines CRT */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px)',
        }}
      />

      {/* Anneaux d'onde (victoire uniquement) */}
      {isVictory && (
        <>
          <span className="anim-ring-expand pointer-events-none absolute left-1/2 top-[44%] z-[1] h-[300px] w-[300px] rounded-full border" style={{ borderColor: theme.accent }} />
          <span className="anim-ring-expand pointer-events-none absolute left-1/2 top-[44%] z-[1] h-[300px] w-[300px] rounded-full border [animation-delay:0.85s]" style={{ borderColor: theme.accent }} />
          <span className="anim-ring-expand pointer-events-none absolute left-1/2 top-[44%] z-[1] h-[300px] w-[300px] rounded-full border [animation-delay:1.7s]" style={{ borderColor: theme.accent }} />
        </>
      )}

      {/* Panneau central */}
      <div
        className="anim-result-rise relative z-[2] flex w-full max-w-[560px] flex-col items-center gap-6 border bg-[#07070e]/85 px-6 py-12 text-center [clip-path:polygon(16px_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%,0_16px)]"
        style={{
          borderColor: theme.accent,
          boxShadow: `0 0 60px rgba(${theme.rgb},0.22), inset 0 0 46px rgba(${theme.rgb},0.05)`,
        }}
      >
        {/* Coins */}
        <span className="absolute left-[-1px] top-[-1px] h-4 w-4 border-l-2 border-t-2" style={{ borderColor: theme.accent }} />
        <span className="absolute bottom-[-1px] right-[-1px] h-4 w-4 border-b-2 border-r-2" style={{ borderColor: theme.accent }} />

        {/* Balayage */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="anim-scan-sweep absolute inset-x-0 h-24"
            style={{ background: `linear-gradient(to bottom, transparent, rgba(${theme.rgb},0.14), transparent)` }}
          />
        </div>

        <div className="text-[10px] tracking-[0.5em]" style={{ color: theme.accent }}>
          <span className="blink">■</span> {theme.tag}
        </div>

        <h1
          className={`leading-none tracking-[0.12em] font-bold text-[clamp(2.5rem,11vw,4.75rem)] ${theme.titleClass}`}
          style={{ color: theme.accent }}
        >
          {theme.title}
        </h1>

        <div className="anim-stagger-in text-[12px] tracking-[0.35em] text-[#8080c0] [animation-delay:240ms]">
          {theme.subtitle}
        </div>

        <div className="anim-stagger-in flex items-center gap-5 border-y border-[#1c1c3a] px-2 py-3 text-[10px] tracking-[0.3em] text-[#4a4a7a] [animation-delay:360ms]">
          <span>ELAPSED_CYCLES</span>
          <span style={{ color: theme.accent }}>{String(turn).padStart(2, '0')}</span>
        </div>

        <div className="mt-1 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate({ to: '/' })}
            className="anim-stagger-in cursor-pointer bg-transparent px-8 py-3 text-[11px] uppercase tracking-[0.25em] [clip-path:polygon(8px_0,100%_0,calc(100%-8px)_100%,0_100%)] transition-[filter,transform,box-shadow] duration-200 ease-out [animation-delay:500ms] hover:-translate-y-px hover:brightness-150 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-1"
            style={{
              color:     theme.accent,
              border:    `1px solid ${theme.accent}`,
              boxShadow: `0 0 12px rgba(${theme.rgb},0.35)`,
            }}
          >
            [RETURN_HOME]
          </button>

          <button
            onClick={onReplay}
            className="anim-stagger-in cursor-pointer border border-[#3a3a6a] bg-transparent px-8 py-3 text-[11px] uppercase tracking-[0.25em] text-[#8080c0] [clip-path:polygon(8px_0,100%_0,calc(100%-8px)_100%,0_100%)] transition-[filter,transform,color,border-color] duration-200 ease-out [animation-delay:620ms] hover:-translate-y-px hover:border-[#c0c0e0] hover:text-[#c0c0e0] active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8080c0]/70"
          >
            [REBOOT_SYS]
          </button>
        </div>
      </div>
    </div>
  )
}
