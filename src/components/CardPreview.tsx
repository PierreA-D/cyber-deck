import { createPortal } from 'react-dom'
import { type CardInstance } from '@cyber-deck/engine'
import { getCardStyle, getArtUrl } from './cardStyle'
import { describeSpellEffect } from '@cyber-deck/engine'

const PREVIEW_W = 250

interface Props {
  card: CardInstance
  anchor: DOMRect
}

// Position flottante : à droite de la carte si possible, sinon à gauche, clampée à l'écran.
function computePosition(anchor: DOMRect): { left: number; top: number } {
  const gap = 12
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = anchor.right + gap
  if (left + PREVIEW_W > vw - 8) left = anchor.left - gap - PREVIEW_W
  if (left < 8) left = Math.max(8, (vw - PREVIEW_W) / 2)

  const estHeight = 300
  const top = Math.min(Math.max(8, anchor.top - 20), vh - 8 - estHeight)

  return { left, top }
}

export function CardPreview({ card, anchor }: Props) {
  const ts = getCardStyle(card)
  const { left, top } = computePosition(anchor)
  const spell = card.data.spellEffect
  const artUrl = getArtUrl(card)

  return createPortal(
    <div
      className="pointer-events-none fixed z-[13000] flex flex-col overflow-hidden rounded-sm font-mono"
      style={{
        left,
        top,
        width: PREVIEW_W,
        background: '#080812',
        border: `1px solid ${ts.color}`,
        boxShadow: `0 0 24px ${ts.color}55, inset 0 0 32px ${ts.color}12`,
      }}
    >
      {/* Art */}
      <div className="relative h-[132px] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${ts.color}20 0%, #0a0a18 65%)` }}
        />
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${artUrl})` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,18,0.1) 0%, rgba(8,8,18,0.85) 100%)' }} />
        <div className="absolute left-2 bottom-1.5 right-2">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold tracking-[0.5px] text-white">
            {card.data.name.toUpperCase()}
          </div>
          <div className="text-[9px] tracking-[1.5px]" style={{ color: ts.color }}>{ts.code}</div>
        </div>
      </div>

      {/* Stats */}
      {(card.data.attack !== undefined || card.data.maxHp !== undefined || card.data.healAmount !== undefined) && (
        <div className="flex items-center gap-3 border-b border-[#1c1c3a] px-3 py-1.5 text-[11px]">
          {card.data.attack !== undefined && (
            <span><span className="text-[#36366a]">ATK </span><span className="text-[#ff8888]">{card.data.attack + card.attackBuff}</span></span>
          )}
          {card.data.maxHp !== undefined && (
            <span><span className="text-[#36366a]">HP </span><span className="text-[#00ff4c]">{card.currentHp}</span><span className="text-[#36366a]">/{card.data.maxHp}</span></span>
          )}
          {card.data.healAmount !== undefined && (
            <span><span className="text-[#36366a]">HLR </span><span className="text-[#00ff4c]">+{card.data.healAmount}</span></span>
          )}
        </div>
      )}

      {/* Effet du sort */}
      {spell && (
        <div className="px-3 py-1.5 text-[10px] leading-snug" style={{ color: ts.color }}>
          <span className="mr-1">⚡</span>{describeSpellEffect(spell)}
        </div>
      )}

      {/* Description */}
      <div className="px-3 py-2 text-[10px] leading-relaxed text-[#9a9ad0]">
        {card.data.description || '// Aucune description disponible'}
      </div>
    </div>,
    document.body,
  )
}
