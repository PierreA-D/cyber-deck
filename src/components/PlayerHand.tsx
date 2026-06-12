import { type CardInstance } from '../engine/CardInstance'
import { CardComponent } from './CardComponent'

interface Props {
  cards: CardInstance[]
  onCardClick?: (instanceId: string) => void
  selectedId?: string | null
  disabled?: boolean
}

export function PlayerHand({ cards, onCardClick, selectedId, disabled }: Props) {
  return (
    <div style={{
      border: '1px solid #2ecc71',
      borderRadius: '8px',
      padding: '12px',
      background: 'rgba(46,204,113,0.05)',
    }}>
      <div style={{ color: '#2ecc71', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>
        Your Hand ({cards.length}) — drag a card to the board to play it
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {cards.map(card => (
          <CardComponent
            key={card.instanceId}
            card={card}
            draggable={!disabled}
            selected={card.instanceId === selectedId}
            onClick={() => onCardClick?.(card.instanceId)}
            disabled={disabled}
          />
        ))}
        {cards.length === 0 && (
          <div style={{ color: '#444', fontSize: '12px', padding: '8px' }}>No cards in hand.</div>
        )}
      </div>
    </div>
  )
}