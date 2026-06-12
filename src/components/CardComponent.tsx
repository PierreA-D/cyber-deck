import { useDraggable } from '@dnd-kit/core'
import { type CardInstance, isSwapCard } from '../engine/CardInstance'
import { CardType } from '../engine/CardEnums'

interface Props {
  card: CardInstance
  draggable?: boolean
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
}

interface TypeStyle {
  color:  string
  selBg:  string
  code:   string
}

const TYPE_STYLE: Record<CardType, TypeStyle> = {
  [CardType.Warrior]:  { color: '#ff3d3d', selBg: 'rgba(255,61,61,0.14)',   code: 'UNIT.WAR' },
  [CardType.Defender]: { color: '#00e5ff', selBg: 'rgba(0,229,255,0.12)',   code: 'UNIT.DEF' },
  [CardType.Healer]:   { color: '#00ff4c', selBg: 'rgba(0,255,76,0.12)',    code: 'UNIT.HLR' },
  [CardType.Champion]: { color: '#ffe000', selBg: 'rgba(255,224,0,0.10)',   code: 'SYS.CHAM' },
}

const SWAP_STYLE: TypeStyle = { color: '#b000ff', selBg: 'rgba(176,0,255,0.14)', code: 'SYS.SWAP' }

export function CardComponent({ card, draggable, onClick, selected, disabled }: Props) {
  const isSwap = isSwapCard(card)
  const isChamp = card.data.type === CardType.Champion
  const ts = isSwap ? SWAP_STYLE : TYPE_STYLE[card.data.type]

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.instanceId,
    disabled: !draggable || disabled,
  })

  const hpPct = card.data.maxHp ? Math.max(0, card.currentHp / card.data.maxHp) : 1
  const hpColor = hpPct > 0.6 ? '#00ff4c' : hpPct > 0.3 ? '#ffe000' : '#ff3d3d'
  const isInteractive = !disabled && (!!onClick || !!draggable)
  const moveClass = isInteractive && !isDragging
    ? 'hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]'
    : ''

  const cardStyle = {
    width: isChamp ? 'clamp(106px, 12.4vw, 128px)' : 'clamp(92px, 10.4vw, 106px)',
    minHeight: isChamp ? 'clamp(126px, 14.2vw, 148px)' : 'clamp(106px, 12.2vw, 126px)',
    background: selected ? ts.selBg : '#0c0c1e',
    border: `1px solid ${selected ? '#ffffff' : ts.color}`,
    cursor: draggable && !disabled ? 'grab' : disabled ? 'default' : 'pointer',
    opacity: isDragging ? 0.15 : card.isExhausted ? 0.4 : 1,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    zIndex: isDragging ? 999 : undefined,
    boxShadow: selected
      ? `0 0 14px ${ts.color}88, inset 0 0 20px ${ts.color}10`
      : `0 0 6px ${ts.color}22`,
    transition: isDragging ? 'none' : 'border-color 0.18s, box-shadow 0.18s, transform 0.18s, opacity 0.18s',
  } as React.CSSProperties

  return (
    <div
      ref={setNodeRef}
      className={`relative flex select-none flex-col gap-1 rounded-sm px-2 py-1.5 text-[11px] text-[#c0c0e0] transition-[transform,filter] duration-200 ease-out focus-within:ring-1 focus-within:ring-[#c0c0e0]/40 ${moveClass}`}
      style={cardStyle}
      onClick={disabled ? undefined : onClick}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      <div
        className="absolute right-0 top-0 h-2.5 w-2.5 opacity-90 transition-opacity duration-200 [clip-path:polygon(0_0,100%_0,100%_100%)]"
        style={{ background: ts.color }}
      />

      <div
        className={`mr-2 overflow-hidden text-ellipsis whitespace-nowrap font-bold tracking-[0.5px] text-white ${isChamp ? 'text-[11px]' : 'text-[10px]'}`}
      >
        {card.data.name.toUpperCase()}
      </div>

      <div
        className="mb-0.5 border-b pb-0.5 text-[9px] tracking-[1px] transition-colors duration-200"
        style={{ color: ts.color, borderBottomColor: `${ts.color}33` }}
      >
        {ts.code}
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        {card.data.attack !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[1px] text-[#36366a]">ATK</span>
            <span className="text-[#ff8888]">
              {String(card.data.attack + card.attackBuff).padStart(2, '0')}
            </span>
          </div>
        )}
        {card.data.maxHp !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[1px] text-[#36366a]">HP</span>
            <span style={{ color: hpColor }}>
              {card.currentHp}
              <span className="text-[#36366a]">/{card.data.maxHp}</span>
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
          <div className="mt-0.5 text-[9px] tracking-[1px] text-[#b000ff]">
            DECK_SWAP
          </div>
        )}
      </div>

      {card.data.maxHp !== undefined && (
        <div className="mt-0.5 h-0.5 overflow-hidden bg-[#1c1c3a]">
          <div
            style={{
              height: '100%',
              width: `${hpPct * 100}%`,
              background: hpColor,
              transition: 'width 0.35s ease-out, background 0.25s ease-out',
            }}
          />
        </div>
      )}

      {card.isExhausted && (
        <div className="absolute bottom-1 right-[5px] bg-[rgba(0,0,0,0.85)] px-[3px] py-px text-[8px] tracking-[1px] text-[#ff3d3d]">
          EXHSTD
        </div>
      )}
    </div>
  )
}