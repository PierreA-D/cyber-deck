import { useDroppable } from '@dnd-kit/core'
import { type CardInstance } from '../engine/CardInstance'
import { CardComponent } from './CardComponent'

interface Props {
  id: string
  label: string
  cards: CardInstance[]
  onCardClick?: (instanceId: string) => void
  selectedId?: string | null
  highlight?: boolean
  attackable?: boolean
}

export function BoardZone({ id, label, cards, onCardClick, selectedId, highlight, attackable }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const borderColor = isOver    ? '#00ff4c'
    : attackable              ? '#ff3d3d'
    : highlight               ? 'rgba(0,229,255,0.35)'
    : '#1c1c3a'

  const accentColor = isOver   ? '#00ff4c'
    : attackable              ? '#ff3d3d'
    : highlight               ? '#00e5ff'
    : '#36366a'

  return (
    <div
      ref={setNodeRef}
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: '1px',
        padding: '10px 12px',
        minHeight: '148px',
        background: isOver
          ? 'rgba(0,255,76,0.04)'
          : attackable
          ? 'rgba(255,61,61,0.03)'
          : highlight
          ? 'rgba(0,229,255,0.02)'
          : '#09090f',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
        boxShadow: isOver
          ? '0 0 16px rgba(0,255,76,0.25), inset 0 0 20px rgba(0,255,76,0.04)'
          : attackable
          ? '0 0 10px rgba(255,61,61,0.2)'
          : 'none',
      }}
    >
      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: -1, left: -1, width: 8, height: 8,
        borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8,
        borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />

      {/* Zone label */}
      <div style={{
        color: accentColor, fontSize: '9px', letterSpacing: '3px',
        marginBottom: '10px', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span>{label}</span>
        <span style={{ color: '#1c1c3a' }}>■</span>
        <span>{cards.length} UNITS</span>
        {isOver    && <span style={{ color: '#00ff4c', marginLeft: '6px' }}>// DROP_TO_DEPLOY</span>}
        {attackable && !isOver && <span style={{ marginLeft: '6px' }}>// SELECT_TARGET</span>}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {cards.map(card => (
          <CardComponent
            key={card.instanceId}
            card={card}
            selected={card.instanceId === selectedId}
            onClick={() => onCardClick?.(card.instanceId)}
          />
        ))}
        {cards.length === 0 && (
          <div style={{ color: '#2a2a4a', fontSize: '10px', padding: '8px', letterSpacing: '2px' }}>
            {isOver ? '// DEPLOY_UNIT' : '-- EMPTY --'}
          </div>
        )}
      </div>
    </div>
  )
}