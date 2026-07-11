import { type CardInstance } from '@cyber-deck/engine'
import { CardComponent } from './CardComponent'
import { AnimatePresence } from 'motion/react'

interface Props {
  cards: CardInstance[]
  onCardClick?: (instanceId: string) => void
  selectedId?: string | null
  disabled?: boolean
}

export function PlayerHand({ cards, onCardClick, selectedId, disabled }: Props) {
  const accentColor = disabled ? '#2a2a5a' : '#00e5ff'
  const borderColor = disabled ? '#1c1c3a' : 'rgba(0,229,255,0.35)'
  const panelBackground = disabled ? '#09090f' : 'rgba(0,229,255,0.02)'

  return (
    <div
      className="relative flex min-h-[108px] flex-1 flex-col rounded-sm px-2.5 py-2.5 transition-[border-color,background-color,box-shadow] duration-200 ease-out sm:px-3 sm:py-3 xl:h-[188px] xl:min-h-0 xl:flex-none"
      style={{ border: `1px solid ${borderColor}`, background: panelBackground }}
    >
      <div
        className="absolute left-[-1px] top-[-1px] h-2 w-2 border-l-2 border-t-2"
        style={{ borderColor: accentColor }}
      />
      <div
        className="absolute bottom-[-1px] right-[-1px] h-2 w-2 border-b-2 border-r-2"
        style={{ borderColor: accentColor }}
      />

      <div className="mb-2.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] transition-colors duration-200" style={{ color: accentColor }}>
        <span>HAND.SYS</span>
        <span className="text-[#1c1c3a]">■</span>
        <span>{cards.length} CARDS</span>
        {!disabled && <span className="ml-1.5 text-[#36366a]">// DRAG_TO_DEPLOY</span>}
        {disabled && <span className="ml-1.5 text-[#22224a]">// STANDBY</span>}
      </div>

      <div className="min-h-0 flex flex-1 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden pl-1 py-1">
        <AnimatePresence mode="popLayout">
          {cards.map(card => (
            <CardComponent
              key={card.instanceId}
              card={card}
              draggable={!disabled}
              animateAs="hand"
              selected={card.instanceId === selectedId}
              onClick={() => onCardClick?.(card.instanceId)}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>
        {cards.length === 0 && (
          <div className="p-2 text-[10px] tracking-[0.2em] text-[#2a2a4a]">
            -- NO_DATA --
          </div>
        )}
      </div>
    </div>
  )
}