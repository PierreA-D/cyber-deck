import { useDraggable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'motion/react'
import { type CardInstance, isSwapCard } from '../engine/CardInstance'
import { CardType } from '../engine/CardEnums'

interface Props {
  card: CardInstance
  draggable?: boolean
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
  animateAs?: 'hand' | 'board' | 'champion'
  onRegisterRef?: (instanceId: string, el: HTMLElement | null) => void
}

interface TypeStyle {
  color: string
  selBg: string
  code:  string
}

const TYPE_STYLE: Record<CardType, TypeStyle> = {
  [CardType.Warrior]:  { color: '#ff3d3d', selBg: 'rgba(255,61,61,0.14)',  code: 'UNIT.WAR' },
  [CardType.Defender]: { color: '#00e5ff', selBg: 'rgba(0,229,255,0.12)',  code: 'UNIT.DEF' },
  [CardType.Healer]:   { color: '#00ff4c', selBg: 'rgba(0,255,76,0.12)',   code: 'UNIT.HLR' },
  [CardType.Champion]: { color: '#ffe000', selBg: 'rgba(255,224,0,0.10)',  code: 'SYS.CHAM' },
}

const SWAP_STYLE: TypeStyle = { color: '#b000ff', selBg: 'rgba(176,0,255,0.14)', code: 'SYS.SWAP' }

const HAND_ANIM = {
  initial:  { opacity: 0, y: 32, scale: 0.88 },
  animate:  { opacity: 1, y: 0,  scale: 1 },
  exit:     { opacity: 0, y: 16, scale: 0.92, transition: { duration: 0.18 } },
  transition: { type: 'spring', stiffness: 340, damping: 26 },
}

const BOARD_ANIM = {
  initial:  { opacity: 0, scale: 0.78, y: -12 },
  animate:  { opacity: 1, scale: 1,    y: 0 },
  exit:     { opacity: 0, scale: 0.7,  y: 20, filter: 'brightness(3) saturate(0)', transition: { duration: 0.28 } },
  transition: { type: 'spring', stiffness: 380, damping: 28 },
}

const CHAMPION_ANIM = {
  initial:  { opacity: 0, scale: 0.92 },
  animate:  { opacity: 1, scale: 1 },
  exit:     { opacity: 0, scale: 1.1, filter: 'brightness(4) saturate(0)', transition: { duration: 0.4 } },
  transition: { type: 'spring', stiffness: 260, damping: 22 },
}

function getAnim(animateAs?: 'hand' | 'board' | 'champion') {
  if (animateAs === 'board')    return BOARD_ANIM
  if (animateAs === 'champion') return CHAMPION_ANIM
  return HAND_ANIM
}

export function CardComponent({ card, draggable, onClick, selected, disabled, animateAs, onRegisterRef }: Props) {
  const isSwap  = isSwapCard(card)
  const isChamp = card.data.type === CardType.Champion
  const ts      = isSwap ? SWAP_STYLE : TYPE_STYLE[card.data.type]

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.instanceId,
    disabled: !draggable || disabled,
  })

  const hpPct   = card.data.maxHp ? Math.max(0, card.currentHp / card.data.maxHp) : 1
  const hpColor = hpPct > 0.6 ? '#00ff4c' : hpPct > 0.3 ? '#ffe000' : '#ff3d3d'

  const isInteractive = !disabled && (!!onClick || !!draggable)
  const moveClass = isInteractive && !isDragging
    ? 'hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]'
    : ''

  const anim = getAnim(animateAs)

  const cardStyle = {
    width:     isChamp ? 'clamp(106px, 12.4vw, 128px)' : 'clamp(92px, 10.4vw, 106px)',
    minHeight: isChamp ? 'clamp(126px, 14.2vw, 148px)' : 'clamp(106px, 12.2vw, 126px)',
    background: selected ? ts.selBg : '#0c0c1e',
    border:    `1px solid ${selected ? '#ffffff' : ts.color}`,
    cursor:    draggable && !disabled ? 'grab' : disabled ? 'default' : 'pointer',
    opacity:   isDragging ? 0.15 : card.isExhausted ? 0.4 : 1,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
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
      className={`relative flex select-none flex-col gap-1 rounded-sm px-2 py-1.5 text-[11px] text-[#c0c0e0] ${moveClass}`}
      style={cardStyle}
      onClick={disabled ? undefined : onClick}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
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
        {isSwap && (
          <div className="mt-0.5 text-[9px] tracking-[1px] text-[#b000ff]">DECK_SWAP</div>
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
    </motion.div>
  )
}