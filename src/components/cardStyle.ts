import { type CardInstance } from '@cyber-deck/engine'
import { CardType } from '@cyber-deck/engine'

export interface TypeStyle {
  color: string
  selBg: string
  code:  string
}

export const TYPE_STYLE: Record<CardType, TypeStyle> = {
  [CardType.Warrior]:   { color: '#ff3d3d', selBg: 'rgba(255,61,61,0.14)',  code: 'UNIT.WAR' },
  [CardType.Defender]:  { color: '#00e5ff', selBg: 'rgba(0,229,255,0.12)',  code: 'UNIT.DEF' },
  [CardType.Healer]:    { color: '#00ff4c', selBg: 'rgba(0,255,76,0.12)',   code: 'UNIT.HLR' },
  [CardType.Legend]:    { color: '#ffe000', selBg: 'rgba(255,224,0,0.10)',  code: 'SYS.CHAM' },
  [CardType.Implant]:   { color: '#b000ff', selBg: 'rgba(176,0,255,0.12)',  code: 'SPL.IMP' },
  [CardType.Overclock]: { color: '#ff8a00', selBg: 'rgba(255,138,0,0.12)',  code: 'SPL.OVR' },
  [CardType.Protocole]: { color: '#00ffd0', selBg: 'rgba(0,255,208,0.12)',  code: 'SPL.PRT' },
  [CardType.Assassin]: { color: '#ff00aa', selBg: 'rgba(255,0,170,0.12)', code: 'UNIT.ASN' },
}

export function getCardStyle(card: CardInstance): TypeStyle {
  return TYPE_STYLE[card.data.type]
}

// Illustration : utilise artKey si présent, sinon une image placeholder stable (seed = id).
export function getArtUrl(card: CardInstance): string {
  return card.data.artKey ?? `https://picsum.photos/seed/${encodeURIComponent(card.data.id)}/240/320`
}
