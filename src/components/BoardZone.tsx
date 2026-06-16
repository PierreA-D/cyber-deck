import { useDroppable } from '@dnd-kit/core'
import { type CardInstance } from '../engine/CardInstance'
import { CardComponent } from './CardComponent'
import { AnimatePresence } from 'motion/react'
import { DroppableCard } from './DroppableCard'

interface Props {
  id: string
  label: string
  cards: CardInstance[]
  onCardClick?: (instanceId: string) => void
  onRegisterRef?: (instanceId: string, el: HTMLElement | null) => void
  selectedId?: string | null
  highlight?: boolean
  attackable?: boolean
  droppableTargets?: boolean
  draggableUnits?: boolean
}

export function BoardZone({ id, label, cards, onCardClick, selectedId, highlight, attackable, droppableTargets, draggableUnits, onRegisterRef }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const borderColor = isOver    ? '#00ff4c'
    : attackable              ? '#ff3d3d'
    : highlight               ? 'rgba(0,229,255,0.35)'
    : '#1c1c3a'

  const accentColor = isOver   ? '#00ff4c'
    : attackable              ? '#ff3d3d'
    : highlight               ? '#00e5ff'
    : '#36366a'

  const zoneBackground = isOver
    ? 'rgba(0,255,76,0.04)'
    : attackable
      ? 'rgba(255,61,61,0.03)'
      : highlight
        ? 'rgba(0,229,255,0.02)'
        : '#09090f'

  const zoneShadow = isOver
    ? '0 0 16px rgba(0,255,76,0.25), inset 0 0 20px rgba(0,255,76,0.04)'
    : attackable
      ? '0 0 10px rgba(255,61,61,0.2)'
      : 'none'

  return (
    <div
      ref={setNodeRef}
      className="relative flex min-h-[112px] flex-1 flex-col rounded-sm px-2.5 py-2.5 transition-[border-color,box-shadow,background-color] duration-200 ease-out sm:px-3 sm:py-3 xl:h-[200px] xl:min-h-0 xl:flex-none"
      style={{
        border: `1px solid ${borderColor}`,
        background: zoneBackground,
        boxShadow: zoneShadow,
      }}
    >
      <div
        className="absolute left-[-1px] top-[-1px] h-2 w-2 border-l-2 border-t-2"
        style={{ borderColor: accentColor }}
      />
      <div
        className="absolute bottom-[-1px] right-[-1px] h-2 w-2 border-b-2 border-r-2"
        style={{ borderColor: accentColor }}
      />

      <div
        className="mb-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] transition-colors duration-200"
        style={{ color: accentColor }}
      >
        <span>{label}</span>
        <span className="text-[#1c1c3a]">■</span>
        <span>{cards.length} UNITS</span>
        {isOver && <span className="ml-1.5 text-[#00ff4c]">// DROP_TO_DEPLOY</span>}
        {attackable && !isOver && <span className="ml-1.5">// SELECT_TARGET</span>}
      </div>

      <div className="flex min-h-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden">
        <AnimatePresence mode="popLayout">
          {cards.map(card => (
            droppableTargets ? (
              <DroppableCard
                key={card.instanceId}
                card={card}
                onRegisterRef={onRegisterRef}
                animateAs="board"
              />
            ) : (
              <CardComponent
                key={card.instanceId}
                card={card}
                animateAs="board"
                draggable={draggableUnits}
                selected={card.instanceId === selectedId}
                onClick={() => onCardClick?.(card.instanceId)}
                onRegisterRef={onRegisterRef}
              />
            )
          ))}
        </AnimatePresence>
        {cards.length === 0 && (
          <div className="p-2 text-[10px] tracking-[0.2em] text-[#2a2a4a]">
            {isOver ? '// DEPLOY_UNIT' : '-- EMPTY --'}
          </div>
        )}
      </div>
    </div>
  )
}