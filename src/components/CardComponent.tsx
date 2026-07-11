import { useDraggable } from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { type CardInstance } from '@cyber-deck/engine'
import { CardType } from '@cyber-deck/engine'
import { getCardStyle, getArtUrl } from './cardStyle'
import { CardPreview } from './CardPreview'

interface Props {
  card: CardInstance
  draggable?: boolean
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
  animateAs?: 'hand' | 'board' | 'legend'
  onRegisterRef?: (instanceId: string, el: HTMLElement | null) => void
}

const HAND_ANIM = {
  initial:  { opacity: 0, y: 32, scale: 0.88 },
  animate:  { opacity: 1, y: 0,  scale: 1 },
  exit:     { opacity: 0, y: 16, scale: 0.92, transition: { duration: 0.18 } },
  transition: { type: 'spring' as const, stiffness: 340, damping: 26 },
}

const BOARD_ANIM = {
  initial:  { opacity: 0, scale: 0.78, y: -12 },
  animate:  { opacity: 1, scale: 1,    y: 0 },
  exit:     { opacity: 0, scale: 0.7,  y: 20, filter: 'brightness(3) saturate(0)', transition: { duration: 0.28 } },
  transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
}

const LEGEND_ANIM = {
  initial:  { opacity: 0, scale: 0.92 },
  animate:  { opacity: 1, scale: 1 },
  exit:     { opacity: 0, scale: 1.1, filter: 'brightness(4) saturate(0)', transition: { duration: 0.4 } },
  transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
}

function getAnim(animateAs?: 'hand' | 'board' | 'legend') {
  if (animateAs === 'board')    return BOARD_ANIM
  if (animateAs === 'legend') return LEGEND_ANIM
  return HAND_ANIM
}

export function CardComponent({ card, draggable, onClick, selected, disabled, animateAs, onRegisterRef }: Props) {
  const isChamp = card.data.type === CardType.Legend
  const ts      = getCardStyle(card)
  const artUrl  = getArtUrl(card)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.instanceId,
    disabled: !draggable || disabled,
  })

  // Retour visuel d'« armement » pendant l'appui tactile, avant le déclenchement du drag.
  const canDrag = !!draggable && !disabled
  const [charging, setCharging] = useState(false)

  // Preview agrandie (survol souris ou appui long tactile).
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPreviewTimer = () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current)
      previewTimer.current = null
    }
  }

  const schedulePreview = (el: HTMLElement, delay: number) => {
    clearPreviewTimer()
    previewTimer.current = setTimeout(() => {
      setPreviewRect(el.getBoundingClientRect())
    }, delay)
  }

  const hidePreview = () => {
    clearPreviewTimer()
    setPreviewRect(null)
  }

  useEffect(() => () => clearPreviewTimer(), [])

  useEffect(() => {
    if (!isDragging) return
    // Réinitialisation asynchrone (hors cascade synchrone) au démarrage du drag.
    const t = setTimeout(() => {
      setCharging(false)
      setPreviewRect(null)
      if (previewTimer.current) {
        clearTimeout(previewTimer.current)
        previewTimer.current = null
      }
    }, 0)
    return () => clearTimeout(t)
  }, [isDragging])

  const hpPct   = card.data.maxHp ? Math.max(0, card.currentHp / card.data.maxHp) : 1
  const hpColor = hpPct > 0.6 ? '#00ff4c' : hpPct > 0.3 ? '#ffe000' : '#ff3d3d'

  const isInteractive = !disabled && (!!onClick || !!draggable)
  const moveClass = isInteractive && !isDragging
    ? 'hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]'
    : ''

  const anim = getAnim(animateAs)

  const cardStyle = {
    width:     isChamp ? 'clamp(82px, 22vw, 128px)' : 'clamp(70px, 19vw, 106px)',
    minHeight: isChamp ? 'clamp(104px, 26vw, 148px)' : 'clamp(90px, 22vw, 126px)',
    background: '#0c0c1e',
    border:    `1px solid ${selected ? '#ffffff' : ts.color}`,
    cursor:    draggable && !disabled ? 'grab' : disabled ? 'default' : 'pointer',
    opacity:   isDragging ? 0.15 : card.isExhausted ? 0.4 : 1,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    touchAction: draggable && !disabled ? 'none' : undefined,
    zIndex:    isDragging ? 999 : undefined,
    boxShadow: selected
      ? `0 0 14px ${ts.color}88, inset 0 0 20px ${ts.color}10`
      : `0 0 6px ${ts.color}22`,
    transition: isDragging ? 'none' : 'border-color 0.18s, box-shadow 0.18s, opacity 0.18s',
  } as React.CSSProperties

  return (
    <motion.div
      ref={el => {
        setNodeRef(el)
        onRegisterRef?.(card.instanceId, el)
      }}
      layout
      initial={anim.initial}
      animate={anim.animate}
      exit={anim.exit}
      transition={anim.transition}
      className={`relative isolate flex select-none flex-col gap-1 rounded-sm px-2 py-1.5 text-[11px] text-[#c0c0e0] ${moveClass}`}
      style={cardStyle}
      onClick={disabled ? undefined : onClick}
      onPointerEnter={e => { if (e.pointerType === 'mouse') schedulePreview(e.currentTarget, 250) }}
      onPointerDown={e => {
        if (canDrag) setCharging(true)
        if (e.pointerType !== 'mouse') schedulePreview(e.currentTarget, 450)
      }}
      onPointerMove={e => { if (e.pointerType !== 'mouse') hidePreview() }}
      onPointerUp={e => { if (canDrag) setCharging(false); if (e.pointerType !== 'mouse') hidePreview() }}
      onPointerCancel={() => { setCharging(false); hidePreview() }}
      onPointerLeave={() => { setCharging(false); hidePreview() }}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      {/* Fond / illustration (placeholder en attendant l'art) */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-sm">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(165deg, ${ts.color}1a 0%, #0b0b1c 62%)` }}
        />
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${artUrl})` }} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(8,8,18,0.45) 0%, rgba(8,8,18,0.12) 40%, rgba(8,8,18,0.82) 100%)' }}
        />
        {selected && <div className="absolute inset-0" style={{ background: ts.selBg }} />}
      </div>
      {/* Indicateur de saisie (appui avant le drag) */}
      <AnimatePresence>
        {charging && !isDragging && (
          <motion.div
            key="charge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="pointer-events-none absolute inset-0 z-10 rounded-sm"
            style={{ boxShadow: `inset 0 0 0 2px ${ts.color}, 0 0 12px ${ts.color}66`, background: `${ts.color}12` }}
          />
        )}
      </AnimatePresence>

      {/* Corner accent */}
      <div
        className="absolute right-0 top-0 h-2.5 w-2.5 opacity-90 [clip-path:polygon(0_0,100%_0,100%_100%)]"
        style={{ background: ts.color }}
      />

      {/* Name */}
      <div className={`mr-2 overflow-hidden text-ellipsis whitespace-nowrap font-bold tracking-[0.5px] text-white ${isChamp ? 'text-[11px]' : 'text-[10px]'}`}>
        {card.data.name.toUpperCase()}
      </div>

      {/* Type code */}
      <div
        className="mb-0.5 border-b pb-0.5 text-[9px] tracking-[1px]"
        style={{ color: ts.color, borderBottomColor: `${ts.color}33` }}
      >
        {ts.code}
      </div>

      {/* Stats */}
      <div className="flex flex-1 flex-col gap-0.5">
        {card.data.attack !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[1px] text-[#36366a]">ATK</span>
            <span className="text-[#ff8888]">{String(card.data.attack + card.attackBuff).padStart(2, '0')}</span>
          </div>
        )}
        {card.data.maxHp !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[1px] text-[#36366a]">HP</span>
            <span style={{ color: hpColor }}>
              {card.currentHp}<span className="text-[#36366a]">/{card.data.maxHp}</span>
            </span>
          </div>
        )}
        {card.data.healAmount !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[1px] text-[#36366a]">HLR</span>
            <span className="text-[#00ff4c]">+{card.data.healAmount}</span>
          </div>
        )}
      </div>

      {/* HP bar */}
      {card.data.maxHp !== undefined && (
        <div className="mt-0.5 h-0.5 overflow-hidden bg-[#1c1c3a]">
          <motion.div
            animate={{ width: `${hpPct * 100}%`, background: hpColor }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ height: '100%' }}
          />
        </div>
      )}

      {/* Exhausted */}
      {card.isExhausted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-1 right-[5px] bg-[rgba(0,0,0,0.85)] px-[3px] py-px text-[8px] tracking-[1px] text-[#ff3d3d]"
        >
          EXHSTD
        </motion.div>
      )}

      {previewRect && !isDragging && <CardPreview card={card} anchor={previewRect} />}
    </motion.div>
  )
}