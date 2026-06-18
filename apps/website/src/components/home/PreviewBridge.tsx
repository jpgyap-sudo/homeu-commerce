'use client'

/**
 * Injected into the storefront homepage ONLY when rendered inside the admin
 * Theme editor's preview iframe (?preview=N). Makes every section — and the
 * site header — hover-highlightable and click-to-select. Clicking posts the
 * selected section to the parent admin window, which opens its settings.
 *
 * Outside the iframe this renders nothing and wires up nothing.
 */

import { useEffect } from 'react'

const SELECTOR = '[data-section-id], [data-section-type="header-section"]'

export function PreviewBridge() {
  useEffect(() => {
    // Only activate inside an iframe (the admin preview)
    if (typeof window === 'undefined' || window.parent === window) return

    document.body.classList.add('homeu-preview-mode')

    // Floating outline + toolbar that follows the hovered section
    const outline = document.createElement('div')
    outline.className = 'homeu-preview-outline'
    const label = document.createElement('div')
    label.className = 'homeu-preview-label'
    outline.appendChild(label)

    // Action toolbar (Edit / Move up / Move down) — clickable
    const bar = document.createElement('div')
    bar.className = 'homeu-preview-bar'
    const mkBtn = (txt: string, action: string, title: string) => {
      const b = document.createElement('button')
      b.className = 'homeu-preview-btn'
      b.textContent = txt
      b.title = title
      b.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation()
        if (!current) return
        const isHeader = current.getAttribute('data-section-type') === 'header-section'
        window.parent.postMessage({
          source: 'homeu-preview', kind: 'action', action,
          id: isHeader ? 'header' : Number(current.getAttribute('data-section-id')),
        }, '*')
      })
      return b
    }
    bar.appendChild(mkBtn('✎ Edit', 'edit', 'Edit this section'))
    bar.appendChild(mkBtn('▲', 'up', 'Move up'))
    bar.appendChild(mkBtn('▼', 'down', 'Move down'))
    outline.appendChild(bar)
    document.body.appendChild(outline)

    let current: HTMLElement | null = null

    const targetFor = (el: EventTarget | null): HTMLElement | null => {
      if (!(el instanceof Element)) return null
      return el.closest(SELECTOR) as HTMLElement | null
    }

    const place = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      outline.style.display = 'block'
      outline.style.top = `${r.top + window.scrollY}px`
      outline.style.left = `${r.left + window.scrollX}px`
      outline.style.width = `${r.width}px`
      outline.style.height = `${r.height}px`
      const isHeader = el.getAttribute('data-section-type') === 'header-section'
      label.textContent = isHeader ? 'Header' : (el.getAttribute('data-section-label') || 'Section')
    }

    const onMove = (e: MouseEvent) => {
      // Keep the outline/toolbar visible while the cursor is over it
      if (e.target instanceof Node && outline.contains(e.target)) return
      const t = targetFor(e.target)
      if (t && t !== current) { current = t; place(t) }
      else if (t) place(t)
      else { current = null; outline.style.display = 'none' }
    }

    const onClick = (e: MouseEvent) => {
      const t = targetFor(e.target)
      if (!t) return
      e.preventDefault()
      e.stopPropagation()
      const isHeader = t.getAttribute('data-section-type') === 'header-section'
      window.parent.postMessage({
        source: 'homeu-preview',
        kind: 'select',
        id: isHeader ? 'header' : Number(t.getAttribute('data-section-id')),
        sectionType: isHeader ? 'header-section' : t.getAttribute('data-section-type'),
      }, '*')
    }

    // Parent can ask us to highlight a section (editor → preview)
    const onMessage = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.source !== 'homeu-admin') return
      if (d.kind === 'highlight') {
        const el = document.querySelector(`[data-section-id="${d.id}"]`) as HTMLElement | null
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); place(el); current = el }
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick, true)
    window.addEventListener('message', onMessage)
    window.addEventListener('scroll', () => { if (current) place(current) }, { passive: true })

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('message', onMessage)
      document.body.classList.remove('homeu-preview-mode')
      outline.remove()
    }
  }, [])

  return null
}
