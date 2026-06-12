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
  const isSwap  = isSwapCard(card)
  const isChamp = card.data.type === CardType.Champion
  const ts      = isSwap ? SWAP_STYLE : TYPE_STYLE[card.data.type]

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.instanceId,
    disabled: !draggable || disabled,
  })

  const hpPct   = card.data.maxHp ? Math.max(0, card.currentHp / card.data.maxHp) : 1
  const hpColor = hpPct > 0.6 ? '#00ff4c' : hpPct > 0.3 ? '#ffe000' : '#ff3d3d'

  return (
    <div
      ref={setNodeRef}
      style={{
        width:     isChamp ? '110px' : '88px',
        minHeight: isChamp ? '128px' : '112px',
        background: selected ? ts.selBg : '#0c0c1e',
        border: `1px solid ${selected ? '#ffffff' : ts.color}`,
        borderRadius: '1px',
        padding: '7px 8px',
        color: '#c0c0e0',
        cursor: draggable && !disabled ? 'grab' : disabled ? 'default' : 'pointer',
        opacity: isDragging ? 0.15 : card.isExhausted ? 0.4 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '11px',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'border-color 0.1s, box-shadow 0.1s',
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        zIndex: isDragging ? 999 : undefined,
        position: 'relative',
        boxShadow: selected
          ? `0 0 14px ${ts.color}88, inset 0 0 20px ${ts.color}10`
          : `0 0 6px ${ts.color}22`,
      } as React.CSSProperties}
      onClick={disabled ? undefined : onClick}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      {/* Top-right corner cut */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '10px', height: '10px',
        background: ts.color,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
        opacity: 0.9,
      }} />

      {/* Name */}
      <div style={{
        fontWeight: 'bold',
        fontSize: isChamp ? '11px' : '10px',
        color: '#ffffff',
        letterSpacing: '0.5px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginRight: '8px',
      }}>
        {card.data.name.toUpperCase()}
      </div>

      {/* Type badge */}
      <div style={{
        fontSize: '9px',
        color: ts.color,
        letterSpacing: '1px',
        borderBottom: `1px solid ${ts.color}33`,
        paddingBottom: '4px',
        marginBottom: '2px',
      }}>
        {ts.code}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {card.data.attack !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#36366a', fontSize: '9px', letterSpacing: '1px' }}>ATK</span>
            <span style={{ color: '#ff8888' }}>
              {String(card.data.attack + card.attackBuff).padStart(2, '0')}
            </span>
          </div>
        )}
        {card.data.maxHp !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#36366a', fontSize: '9px', letterSpacing: '1px' }}>HP</span>
            <span style={{ color: hpColor }}>
              {card.currentHp}<span style={{ color: '#36366a' }}>/{card.data.maxHp}</span>
            </span>
          </div>
        )}
        {card.data.healAmount !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#36366a', fontSize: '9px', letterSpacing: '1px' }}>HLR</span>
            <span style={{ color: '#00ff4c' }}>+{card.data.healAmount}</span>
          </div>
        )}
        {isSwap && (
          <div style={{ color: '#b000ff', fontSize: '9px', letterSpacing: '1px', marginTop: '2px' }}>
            DECK_SWAP
          </div>
        )}
      </div>

      {/* HP bar */}
      {card.data.maxHp !== undefined && (
        <div style={{ height: '2px', background: '#1c1c3a', marginTop: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${hpPct * 100}%`,
            background: hpColor,
            transition: 'width 0.3s, background 0.3s',
          }} />
        </div>
      )}

      {/* Exhausted badge */}
      {card.isExhausted && (
        <div style={{
          position: 'absolute', bottom: '4px', right: '5px',
          fontSize: '8px', color: '#ff3d3d', letterSpacing: '1px',
          background: 'rgba(0,0,0,0.85)', padding: '1px 3px',
        }}>
          EXHSTD
        </div>
      )}
    </div>
  )
}