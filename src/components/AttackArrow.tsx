import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface Props {
  fromRect: DOMRect
  toRect: DOMRect
  color?: string
  persistent?: boolean
}

export function AttackArrow({ fromRect, toRect, color = '#ff3d3d', persistent = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const arrowRef = useRef<SVGPolygonElement>(null)

  const x1 = fromRect.left + fromRect.width  / 2
  const y1 = fromRect.top  + fromRect.height / 2
  const x2 = toRect.left   + toRect.width    / 2
  const y2 = toRect.top    + toRect.height   / 2

  // Angle pour la pointe de flèche
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)

  useEffect(() => {
    if (!pathRef.current || !arrowRef.current) return

    if (persistent) {
      // En mode persistant (preview de drag), on garde un rendu statique.
      // Pas d'animation ici pour éviter des mises a jour en cascade.
      return
    }

    const length = pathRef.current.getTotalLength()

    gsap.fromTo(pathRef.current,
      { strokeDasharray: length, strokeDashoffset: length, opacity: 1 },
      { strokeDashoffset: 0, duration: 0.2, ease: 'power2.in' }
    )

    gsap.fromTo(arrowRef.current,
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.1, delay: 0.15, transformOrigin: 'center' }
    )

    // Disparaît après l'impact
    gsap.to([pathRef.current, arrowRef.current], {
      opacity: 0,
      duration: 0.15,
      delay: 0.3,
    })
  }, [persistent])

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 12000,
      }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ligne */}
      <path
        ref={pathRef}
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        stroke={color}
        strokeWidth="2"
        fill="none"
        filter="url(#glow)"
        strokeLinecap="round"
      />

      {/* Pointe de flèche */}
      <polygon
        ref={arrowRef}
        points="-8,-5 0,0 -8,5"
        fill={color}
        filter="url(#glow)"
        transform={`translate(${x2}, ${y2}) rotate(${angle})`}
      />
    </svg>
  )
}