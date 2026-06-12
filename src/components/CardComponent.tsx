import { useDraggable } from '@dnd-kit/core'
import { type CardInstance } from '../engine/CardInstance'
import { CardType } from '../engine/CardEnums'

interface Props {
  card: CardInstance
  draggable?: boolean
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
}

const TYPE_COLORS: Record<CardType, string> = {
  [CardType.Warrior]:  '#e74c3c',
  [CardType.Defender]: '#3498db',
  [CardType.Healer]:   '#2ecc71',
  [CardType.Champion]: '#f39c12',
}

export function CardComponent({ card, draggable, onClick, selected, disabled }: Props) {
  const color = TYPE_COLORS[card.data.type]

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.instanceId,
    disabled: !draggable || disabled,
  })

  const style = {
    border: `2px solid ${selected ? '#fff' : color}`,
    borderRadius: '8px',
    padding: '8px',
    width: '90px',
    minHeight: '120px',
    background: selected ? color : '#1a1a2e',
    color: '#fff',
    cursor: draggable && !disabled ? 'grab' : disabled ? 'not-allowed' : 'pointer',
    opacity: isDragging ? 0.3 : card.isExhausted ? 0.5 : 1,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '4px',
    fontSize: '12px',
    userSelect: 'none' as const,
    transition: isDragging ? 'none' : 'all 0.15s',
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    zIndex: isDragging ? 999 : undefined,
    position: 'relative' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={disabled ? undefined : onClick}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{card.data.name}</div>
      <div style={{ color }}>{card.data.type}</div>
      {card.data.attack !== undefined && <div>⚔️ {card.data.attack + card.attackBuff}</div>}
      {card.data.maxHp !== undefined && <div>❤️ {card.currentHp}/{card.data.maxHp}</div>}
      {card.data.healAmount !== undefined && <div>💚 +{card.data.healAmount}</div>}
      {card.isExhausted && <div style={{ color: '#888', fontSize: '10px' }}>exhausted</div>}
    </div>
  )
}