import { useCallback, useRef } from 'react'
import gsap from 'gsap'

export function useAttackAnimation() {
  const refs = useRef<Map<string, HTMLElement>>(new Map())

  const registerRef = useCallback((instanceId: string, el: HTMLElement | null) => {
    if (el) {
      refs.current.set(instanceId, el)
    } else {
      refs.current.delete(instanceId)
    }
  }, [])

  const playAttack = useCallback((attackerId: string, targetId: string): Promise<void> => {
    return new Promise(resolve => {
      const attacker = refs.current.get(attackerId)
      const target   = refs.current.get(targetId)

      if (!attacker || !target) {
        resolve()
        return
      }

      const aRect = attacker.getBoundingClientRect()
      const tRect = target.getBoundingClientRect()

      const dx = tRect.left + tRect.width  / 2 - (aRect.left + aRect.width  / 2)
      const dy = tRect.top  + tRect.height / 2 - (aRect.top  + aRect.height / 2)

      const tl = gsap.timeline({ onComplete: resolve })

      // Attaquant se projette vers la cible
      tl.to(attacker, {
        x: dx * 0.7,
        y: dy * 0.7,
        scale: 1.08,
        duration: 0.18,
        ease: 'power2.in',
      })

      // Shake de la cible à l'impact
      .to(target, {
        x: 6,
        duration: 0.04,
        ease: 'none',
      }, '-=0.02')
      .to(target, { x: -6, duration: 0.04 })
      .to(target, { x: 4,  duration: 0.04 })
      .to(target, { x: -4, duration: 0.04 })
      .to(target, { x: 0,  duration: 0.04 })

      // Flash rouge sur la cible
      .to(target, {
        filter: 'brightness(3) saturate(0) sepia(1) hue-rotate(-30deg)',
        duration: 0.08,
      }, '-=0.16')
      .to(target, {
        filter: 'brightness(1) saturate(1) sepia(0)',
        duration: 0.2,
      })

      // Retour de l'attaquant
      .to(attacker, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.22,
        ease: 'power2.out',
      }, '-=0.2')
    })
  }, [])

  const playHit = useCallback((targetId: string): Promise<void> => {
    return new Promise(resolve => {
      const target = refs.current.get(targetId)
      if (!target) { resolve(); return }

      gsap.timeline({ onComplete: resolve })
        .to(target, { x: 8,  duration: 0.04 })
        .to(target, { x: -8, duration: 0.04 })
        .to(target, { x: 5,  duration: 0.04 })
        .to(target, { x: -5, duration: 0.04 })
        .to(target, { x: 0,  duration: 0.04 })
    })
  }, [])

  return { registerRef, playAttack, playHit }
}