import { type CardInstance } from '../engine/CardInstance'
import { CardComponent } from './CardComponent'

interface Props {
  cards: CardInstance[]
  onCardClick?: (instanceId: string) => void
  selectedId?: string | null
  disabled?: boolean
}

export function PlayerHand({ cards, onCardClick, selectedId, disabled }: Props) {
  const accentColor = disabled ? '#2a2a5a' : '#00e5ff'

  return (
    <div style={{
      border: `1px solid ${disabled ? '#1c1c3a' : 'rgba(0,229,255,0.35)'}`,
      borderRadius: '1px',
      padding: '10px 12px',
      background: disabled ? '#09090f' : 'rgba(0,229,255,0.02)',
      position: 'relative',
      transition: 'border-color 0.15s',
    }}>
      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: -1, left: -1, width: 8, height: 8,
        borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8,
        borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />

      <div style={{
        color: accentColor, fontSize: '9px', letterSpacing: '3px',
        marginBottom: '10px', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span>HAND.SYS</span>
        <span style={{ color: '#1c1c3a' }}>■</span>
        <span>{cards.length} CARDS</span>
        {!disabled && <span style={{ color: '#36366a', marginLeft: '6px' }}>// DRAG_TO_DEPLOY</span>}
        {disabled  && <span style={{ color: '#22224a', marginLeft: '6px' }}>// STANDBY</span>}
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
          <div style={{ color: '#2a2a4a', fontSize: '10px', padding: '8px', letterSpacing: '2px' }}>
            -- NO_DATA --
          </div>
        )}
      </div>
    </div>
  )
}