'use client'

/**
 * SectionAnimation.tsx — THE GENIUS
 * ===================================
 * IntersectionObserver-based scroll animation for sections.
 * When a section scrolls into view, it gets the `homeu-animated` class
 * which triggers the CSS animation defined in theme-styles.ts.
 *
 * Wraps the section content div and observes it.
 * Zero config needed — reads data-anim and data-anim-delay from the DOM.
 *
 * USAGE (in HomeSections.tsx):
 *   <SectionAnimation anim={cfg.animation} delay={cfg.animationDelay}>
 *     <div data-section-id={sec.id}>...</div>
 *   </SectionAnimation>
 */

import { useEffect, useRef } from 'react'

interface Props {
  anim: string
  delay?: number
  children: React.ReactNode
}

export default function SectionAnimation({ anim, delay = 0, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !anim || anim === 'none') return

    // Set data attributes for CSS animation hooks
    el.setAttribute('data-anim', anim)
    if (delay > 0) el.setAttribute('data-anim-delay', String(delay))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Small delay if specified, then trigger
            const ms = delay || 0
            setTimeout(() => {
              el.classList.add('homeu-animated')
            }, ms)
            observer.unobserve(el)
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [anim, delay])

  // If no animation, render children directly
  if (!anim || anim === 'none') {
    return <>{children}</>
  }

  return <div ref={ref} style={{ opacity: 0 }}>{children}</div>
}
