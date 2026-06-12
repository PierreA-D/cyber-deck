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

  return (
    <div
      ref={setNodeRef}
      style={{
        border: `1px solid ${isOver ? '#2ecc71' : highlight ? '#f39c12' : attackable ? '#e74c3c' : '#333'}`,
        borderRadius: '8px',
        padding: '12px',
        minHeight: '160px',
        background: isOver
          ? 'rgba(46,204,113,0.08)'
          : highlight
          ? 'rgba(243,156,18,0.05)'
          : 'rgba(255,255,255,0.03)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>
        {label} ({cards.length})
        {isOver && <span style={{ color: '#2ecc71', marginLeft: '8px' }}>Drop here</span>}
      </div>
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
          <div style={{ color: '#444', fontSize: '12px', padding: '8px' }}>
            {isOver ? '✨ Release to play' : 'empty'}
          </div>
        )}
      </div>
    </div>
  )
}