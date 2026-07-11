import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { TYPE_STYLE } from './cardStyle'
import type { CardData } from '@cyber-deck/engine'
import { CardType } from '@cyber-deck/engine'
import { describeSpellEffect } from '@cyber-deck/engine'

const ACCENT = '#00e5ff'
const ACCENT_2 = '#ff2d78'

function artUrl(card: CardData): string {
  return card.artKey ?? `https://picsum.photos/seed/${encodeURIComponent(card.id)}/240/320`
}

function rarityLabel(type: CardType): string {
  if (type === CardType.Legend) return 'LEGENDARY'
  if (type === CardType.Healer || type === CardType.Defender) return 'RARE'
  return 'COMMON'
}

type Phase = 'boot' | 'sealed' | 'opening' | 'revealed'

const NOISE_CHARS = '0123456789ABCDEF#%$&/<>*!?ØÐ§'
function noiseBlock(): string {
  const line = () => {
    let s = ''
    for (let i = 0; i < 46; i++) s += NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]
    return s
  }
  return `${line()}\n${line()}\n${line()}`
}

interface FoilState {
  rx: number
  ry: number
  fx: number
  fy: number
}

const REST: FoilState = { rx: 0, ry: 0, fx: 50, fy: 50 }

interface PackFaceProps {
  name: string
  code?: string
  foil: FoilState
}

/** Illustration recto du booster, composée de couches à profondeurs (translateZ) différentes
 *  pour produire l'effet parallax semi-3D quand le pack pivote. */
function PackFace({ name, code, foil }: PackFaceProps) {
  return (
    <>
      {/* Halo arrière (profondeur -60) */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-[28px]"
        style={{
          transform: 'translateZ(-60px)',
          background: `radial-gradient(circle at 50% 40%, ${ACCENT}55, transparent 70%)`,
          filter: 'blur(10px)',
        }}
      />

      {/* Corps du pack : base plane clippée (textures internes) */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[22px] border"
        style={{
          borderColor: `${ACCENT}88`,
          background: 'linear-gradient(160deg,#0c1226 0%,#0a0a16 45%,#160617 100%)',
          boxShadow: `inset 0 0 40px rgba(0,0,0,0.6), 0 0 30px ${ACCENT}33`,
        }}
      >
        {/* Bandes holographiques */}
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{ background: `repeating-linear-gradient(115deg, ${ACCENT}00 0px, ${ACCENT}22 6px, ${ACCENT_2}22 12px, ${ACCENT}00 18px)` }}
        />
        {/* Grille */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Voile supérieur */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent 30%)' }}
        />
      </div>

      {/* Reflet holographique suivant le curseur (profondeur 20) */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          transform: 'translateZ(20px)',
          background: `radial-gradient(240px circle at ${foil.fx}% ${foil.fy}%, rgba(255,255,255,0.5), rgba(255,255,255,0.08) 30%, transparent 60%)`,
        }}
      />

      {/* Emblème central (profondeur 30) */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40"
        style={{ transform: 'translate(-50%,-50%) translateZ(30px)' }}
      >
        <div className="absolute inset-0 rounded-full border" style={{ borderColor: `${ACCENT}55` }} />
        <div className="absolute inset-4 rotate-45 border" style={{ borderColor: `${ACCENT_2}66` }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="anim-neon-pulse text-5xl font-bold" style={{ color: ACCENT, textShadow: `0 0 18px ${ACCENT}` }}>
            ◈
          </div>
        </div>
      </div>

      {/* En-tête (profondeur 46) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3 text-[9px] tracking-[0.3em]"
        style={{ transform: 'translateZ(46px)', color: ACCENT }}
      >
        <span>DATA BOOSTER</span>
        <span className="text-rose-300">SEALED</span>
      </div>

      {/* Nom du booster (profondeur 46) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 py-4" style={{ transform: 'translateZ(46px)' }}>
        <div className="text-lg font-bold tracking-[0.18em] text-slate-100" style={{ textShadow: `0 0 14px ${ACCENT}66` }}>
          {name.toUpperCase()}
        </div>
        <div className="mt-1 text-[9px] tracking-[0.3em] text-slate-400">{code ?? 'ENCRYPTED'} // 5 CARDS</div>
      </div>
    </>
  )
}

interface BootScreenProps {
  boosterName: string
  ready: boolean
  noise: string
}

/** Écran de "décryptage" glitch affiché pendant l'achat (appel serveur). */
function BootScreen({ boosterName, ready, noise }: BootScreenProps) {
  return (
    <div className="relative flex h-[440px] w-full max-w-lg flex-col items-center justify-center overflow-hidden rounded-lg border border-cyan-400/20 bg-[#05050b]/80 px-6">
      <div
        className="anim-scan-sweep pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(0,229,255,0.22), transparent)' }}
      />
      <div className="relative w-full text-center">
        <div className="text-[10px] tracking-[0.4em] text-rose-400">// BLACK MARKET UPLINK</div>
        <div className="anim-text-glitch mt-3 text-3xl font-bold tracking-[0.28em] text-cyan-100">
          {ready ? 'PAYLOAD READY' : 'DECRYPTING'}
          <span className="blink">_</span>
        </div>
        <div className="mt-2 text-[11px] tracking-[0.3em] text-cyan-300/80">{boosterName.toUpperCase()}</div>

        <pre className="mt-6 select-none overflow-hidden whitespace-pre-wrap break-all text-left font-mono text-[10px] leading-relaxed tracking-[0.12em] text-cyan-500/50">
          {noise}
        </pre>

        <div className="mt-5 h-1 w-full overflow-hidden rounded bg-cyan-500/10">
          <div
            className="h-full bg-cyan-400 transition-all duration-500"
            style={{ width: ready ? '100%' : '68%', boxShadow: '0 0 10px #00e5ff' }}
          />
        </div>
        <div className="mt-2 text-[9px] tracking-[0.3em] text-slate-500">
          {ready ? 'DECRYPTION COMPLETE' : 'BREACHING FIREWALL...'}
        </div>
      </div>
    </div>
  )
}

interface BoosterRevealProps {
  boosterName: string
  code?: string
  cost: number
  balance: number
  cards: CardData[] | null
  onClose: () => void
}

export function BoosterReveal({ boosterName, code, cost, balance, cards, onClose }: BoosterRevealProps) {
  const [phase, setPhase] = useState<Phase>('boot')
  const [foil, setFoil] = useState<FoilState>(REST)
  const [noise, setNoise] = useState<string>(noiseBlock)
  const [minBootDone, setMinBootDone] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const packRef = useRef<HTMLButtonElement>(null)

  const shownCards = cards ?? []

  // Durée minimale de l'écran de décryptage (même si la réponse serveur est instantanée).
  useEffect(() => {
    const t = setTimeout(() => setMinBootDone(true), 950)
    return () => clearTimeout(t)
  }, [])

  // Flux hexadécimal défilant pendant le "hack".
  useEffect(() => {
    if (phase !== 'boot') return
    const id = setInterval(() => setNoise(noiseBlock()), 70)
    return () => clearInterval(id)
  }, [phase])

  // Décryptage terminé + cartes reçues => matérialisation du pack.
  useEffect(() => {
    if (phase !== 'boot' || !minBootDone || cards === null) return
    const t = setTimeout(() => setPhase('sealed'), 0)
    return () => clearTimeout(t)
  }, [phase, minBootDone, cards])

  // Fin de l'animation glitch d'ouverture => cartes.
  useEffect(() => {
    if (phase !== 'opening') return
    const t = setTimeout(() => setPhase('revealed'), 620)
    return () => clearTimeout(t)
  }, [phase])

  const handleMove = useCallback((e: ReactMouseEvent<HTMLButtonElement>) => {
    const el = packRef.current
    if (!el) return
    // Mesure sur le conteneur stable (ni transformé ni animé) pour éviter la boucle
    // de rétroaction rect <-> tilt qui faisait sauter le reflet.
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    setFoil({ rx: -(py - 0.5) * 26, ry: (px - 0.5) * 26, fx: px * 100, fy: py * 100 })
  }, [])

  const handleLeave = useCallback(() => setFoil(REST), [])

  const open = useCallback(() => setPhase(p => (p === 'sealed' ? 'opening' : p)), [])

  const collect = useCallback(() => {
    if (collecting) return
    setCollecting(true)
    window.setTimeout(onClose, 700)
  }, [collecting, onClose])

  return (
    <div
      className="fixed inset-0 z-[13000] flex items-center justify-center overflow-hidden bg-slate-950/85 p-4 backdrop-blur-md"
      onClick={phase === 'revealed' ? onClose : undefined}
    >
      {/* Scanlines globales */}
      <div
        className="anim-noise pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,229,255,0.06) 0px, rgba(0,229,255,0.06) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {phase !== 'boot' && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-md border border-slate-700 px-3 py-1.5 text-[11px] tracking-[0.24em] text-slate-400 transition duration-200 hover:border-cyan-400 hover:text-cyan-300"
        >
          {phase === 'revealed' ? 'CLOSE' : 'SKIP'}
        </button>
      )}

      <div className="relative flex w-full max-w-5xl flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
        {phase === 'boot' ? (
          <BootScreen boosterName={boosterName} ready={cards !== null} noise={noise} />
        ) : (
          <>
            <div className="text-center">
              <div className="text-[10px] tracking-[0.32em] text-rose-400">
                {phase === 'revealed' ? 'DECRYPTION COMPLETE' : 'ENCRYPTED PAYLOAD'}
              </div>
              <div className="text-xl tracking-[0.2em] text-cyan-100">{boosterName}</div>
            </div>

            {phase === 'revealed' ? (
          <div className="relative flex w-full flex-col gap-5">
            {collecting && (
              <div
                className="anim-glitch-flash pointer-events-none absolute inset-0 z-20 mix-blend-screen"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(0,229,255,0.14) 0px, rgba(0,229,255,0.14) 2px, transparent 2px, transparent 4px)',
                }}
              />
            )}
            <div className="max-h-[62vh] w-full overflow-y-auto px-0.5 py-1">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {shownCards.map((card, i) => {
                  const ts = TYPE_STYLE[card.type]
                  const hasStats =
                    card.attack !== undefined || card.maxHp !== undefined || card.healAmount !== undefined
                  return (
                    <div
                      key={`${card.id}-${i}`}
                      className={`${collecting ? 'anim-collect-card' : 'anim-card-emerge'} group flex flex-col overflow-hidden rounded-md`}
                      style={{
                        animationDelay: `${i * (collecting ? 45 : 90)}ms`,
                        background: '#080812',
                        border: `1px solid ${ts.color}`,
                        boxShadow: `0 0 20px ${ts.color}44, inset 0 0 24px ${ts.color}10`,
                      }}
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden">
                        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${ts.color}22 0%, #0a0a18 65%)` }} />
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: `url(${artUrl(card)})` }}
                        />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,18,0.05) 0%, rgba(8,8,18,0.88) 100%)' }} />
                        <div
                          className="absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[8px] font-bold tracking-[0.16em] sm:text-[9px]"
                          style={{ background: `${ts.color}1f`, color: ts.color, border: `1px solid ${ts.color}66` }}
                        >
                          {rarityLabel(card.type)}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 px-2 pb-1.5">
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold tracking-[0.5px] text-white sm:text-sm">
                            {card.name.toUpperCase()}
                          </div>
                          <div className="text-[9px] tracking-[1.5px]" style={{ color: ts.color }}>{ts.code}</div>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col justify-center gap-1 px-2.5 py-2" style={{ borderTop: `1px solid ${ts.color}22` }}>
                        {hasStats ? (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
                            {card.attack !== undefined && (
                              <span><span className="text-[#36366a]">ATK </span><span className="font-bold text-[#ff8888]">{card.attack}</span></span>
                            )}
                            {card.maxHp !== undefined && (
                              <span><span className="text-[#36366a]">HP </span><span className="font-bold text-[#00ff4c]">{card.maxHp}</span></span>
                            )}
                            {card.healAmount !== undefined && (
                              <span><span className="text-[#36366a]">HLR </span><span className="font-bold text-[#00ff4c]">+{card.healAmount}</span></span>
                            )}
                          </div>
                        ) : card.spellEffect ? (
                          <div className="line-clamp-2 text-[10px] leading-snug sm:text-[11px]" style={{ color: ts.color }}>
                            <span className="mr-1">⚡</span>{describeSpellEffect(card.spellEffect)}
                          </div>
                        ) : (
                          <div className="line-clamp-2 text-[10px] leading-snug text-[#9a9ad0] sm:text-[11px]">
                            {card.description || '// DONNÉES CLASSIFIÉES'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-[11px] tracking-[0.2em] text-slate-400">
              <span>-{cost} ₡ // SOLDE {balance.toLocaleString()} ₡</span>
              <button
                onClick={collect}
                disabled={collecting}
                className={`rounded-md border border-cyan-400/80 px-6 py-3 transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  collecting
                    ? 'anim-collect bg-cyan-300 text-slate-950'
                    : 'text-cyan-200 hover:bg-cyan-300 hover:text-slate-950'
                }`}
              >
                {collecting ? 'ACQUIRED ✓' : 'COLLECT'}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex h-[440px] w-full items-center justify-center" style={{ perspective: '1200px' }}>
            {/* Rafale glitch : matérialisation (sealed) puis dissolution (opening) */}
            <div
              key={phase}
              className="anim-glitch-flash pointer-events-none absolute inset-0 z-10 mix-blend-screen"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,0,96,0.25) 0px, rgba(255,0,96,0.25) 2px, transparent 2px, transparent 4px), repeating-linear-gradient(90deg, rgba(0,229,255,0.18) 0px, rgba(0,229,255,0.18) 3px, transparent 3px, transparent 6px)',
              }}
            />

            {phase === 'sealed' ? (
              <button
                ref={packRef}
                type="button"
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
                onClick={open}
                aria-label={`Ouvrir le booster ${boosterName}`}
                className="group relative block h-[380px] w-[260px] cursor-pointer focus:outline-none"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Le bouton mesuré reste immobile ; flottement (idle) et inclinaison
                    (tilt) sont sur des couches internes => reflet stable. */}
                <div className="anim-pack-idle relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
                  <div
                    className="relative h-full w-full"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: `rotateX(${foil.rx}deg) rotateY(${foil.ry}deg)`,
                      transition: 'transform 140ms ease-out',
                    }}
                  >
                    <PackFace name={boosterName} code={code} foil={foil} />
                  </div>
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 -bottom-10 text-center"
                  style={{ transform: 'translateZ(70px)' }}
                >
                  <span className="anim-text-glitch text-[11px] font-bold tracking-[0.3em] text-cyan-300">
                    ▶ CLICK TO DECRYPT ◀
                  </span>
                </div>
              </button>
            ) : (
              <div className="relative h-[380px] w-[260px]">
                <div className="anim-glitch-out absolute inset-0">
                  <PackFace name={boosterName} code={code} foil={REST} />
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
