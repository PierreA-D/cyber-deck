import { useDroppable } from '@dnd-kit/core'
import { type CardInstance } from '@cyber-deck/engine'
import { CardComponent } from './CardComponent'

interface Props {
  card: CardInstance
  onRegisterRef?: (instanceId: string, el: HTMLElement | null) => void
  isTarget?: boolean
  animateAs?: 'board' | 'legend'
  onClick?: (instanceId: string) => void
}

export function DroppableCard({ card, onRegisterRef, isTarget, animateAs, onClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `target-${card.instanceId}`,
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick ? () => onClick(card.instanceId) : undefined}
      style={{
        filter: isOver ? 'brightness(1.4)' : isTarget ? 'brightness(1.2)' : undefined,
        transform: isOver ? 'scale(1.05)' : undefined,
        transition: 'filter 0.15s, transform 0.15s',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <CardComponent
        card={card}
        animateAs={animateAs ?? 'board'}
        onRegisterRef={onRegisterRef}
      />
    </div>
  )
}