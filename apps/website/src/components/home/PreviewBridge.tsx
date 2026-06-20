'use client'

/**
 * PreviewBridge — injected into the storefront homepage ONLY inside the
 * admin Theme editor's preview iframe (?preview=N).
 *
 * Features:
 * - Hover highlight + click-to-select a section / the header
 * - Action toolbar: Edit (opens rail), ▲ Move up, ▼ Move down
 * - ◲ Drag handle: drag-reorder sections
 * - Dblclick editable text → contentEditable → postMessage('edit-text')
 * - Click image → postMessage('pick-image')
 * - Esc/cancel editing
 *
 * Outside the iframe this renders nothing.
 */

import { useEffect, useRef } from 'react'

const SECTION_SEL = '[data-section-id], [data-section-type="header-section"]'

export function PreviewBridge() {
  const dragRef = useRef<{
    el: HTMLElement; startY: number; startRect: DOMRect; midpoints: number[]
    dropline: HTMLElement; draggedId: number
  } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return

    document.body.classList.add('homeu-preview-mode')

    // ── Hover swap buttons for featured product tiles ──────────────
    const swapBtnStyle = document.createElement('style')
    swapBtnStyle.textContent = `
      .homeu-preview-mode .grid-product__image-wrap { position: relative; }
      .homeu-preview-mode .grid-product__image-wrap:hover .homeu-product-swap-btn {
        display: flex !important;
      }
    `
    document.head.appendChild(swapBtnStyle)

    // ── Outline + label ─────────────────────────────────────────────
    const outline = document.createElement('div')
    outline.className = 'homeu-preview-outline'
    outline.innerHTML = '<div class="homeu-preview-label"></div>'
    document.body.appendChild(outline)

    // ── Action toolbar ──────────────────────────────────────────────
    const bar = document.createElement('div')
    bar.className = 'homeu-preview-bar'
    const mkBtn = (txt: string, action: string, title: string) => {
      const b = document.createElement('button')
      b.className = 'homeu-preview-btn'
      b.textContent = txt; b.title = title
      b.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation()
        if (!current) return
        const id = current.getAttribute('data-section-type') === 'header-section'
          ? 'header' : Number(current.getAttribute('data-section-id'))
        window.parent.postMessage({ source: 'homeu-preview', kind: 'action', action, id }, '*')
      })
      return b
    }
    bar.appendChild(mkBtn('✎', 'edit', 'Edit section'))
    bar.appendChild(mkBtn('▲', 'up', 'Move up'))
    bar.appendChild(mkBtn('▼', 'down', 'Move down'))
    // Drag handle
    const dragHandle = document.createElement('button')
    dragHandle.className = 'homeu-preview-btn homeu-preview-dragbtn'
    dragHandle.textContent = '⠿'; dragHandle.title = 'Drag to reorder'
    bar.appendChild(dragHandle)
    outline.appendChild(bar)

    // ── Insertion points — "+" buttons between sections ──────────────
    function refreshInsertionPoints() {
      // Remove old ones
      document.querySelectorAll('.homeu-preview-insert').forEach(el => el.remove())
      const sections = [...document.querySelectorAll('[data-section-id]')] as HTMLElement[]
      if (sections.length === 0) return
      sections.forEach((sec, i) => {
        // Insert point BEFORE this section (including before the first)
        const btn = document.createElement('button')
        btn.className = 'homeu-preview-insert'
        btn.textContent = '+'
        btn.title = 'Add section here'
        btn.dataset.insertBefore = String(i)
        btn.addEventListener('click', (ev) => {
          ev.preventDefault(); ev.stopPropagation()
          window.parent.postMessage({
            source: 'homeu-preview', kind: 'insert-section', beforeIndex: i,
          }, '*')
        })
        sec.parentNode?.insertBefore(btn, sec)
      })
      // Also add one AFTER the last section
      const last = sections[sections.length - 1]
      if (last) {
        const btn = document.createElement('button')
        btn.className = 'homeu-preview-insert'
        btn.textContent = '+'
        btn.title = 'Add section at end'
        btn.dataset.insertBefore = String(sections.length)
        btn.addEventListener('click', (ev) => {
          ev.preventDefault(); ev.stopPropagation()
          window.parent.postMessage({
            source: 'homeu-preview', kind: 'insert-section', beforeIndex: sections.length,
          }, '*')
        })
        last.parentNode?.insertBefore(btn, last.nextSibling)
      }
    }
    // Run after a small delay so DOM is ready
    setTimeout(refreshInsertionPoints, 100)
    // Re-run when sections might change (after messages from admin)
    const origPostMessage = window.parent.postMessage.bind(window.parent)
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.homeu-preview-insert')) refreshInsertionPoints()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // ── Drop indicator line ─────────────────────────────────────────
    const dropline = document.createElement('div')
    dropline.className = 'homeu-preview-dropline'
    dropline.style.display = 'none'
    document.body.appendChild(dropline)

    let current: HTMLElement | null = null
    let editingEl: HTMLElement | null = null // element with contentEditable

    const targetFor = (el: EventTarget | null): HTMLElement | null =>
      el instanceof Element ? el.closest(SECTION_SEL) as HTMLElement | null : null

    const place = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      outline.style.display = 'block'
      outline.style.top = `${r.top + window.scrollY}px`
      outline.style.left = `${r.left + window.scrollX}px`
      outline.style.width = `${r.width}px`
      outline.style.height = `${r.height}px`
      const label = outline.firstChild as HTMLElement
      const isHeader = el.getAttribute('data-section-type') === 'header-section'
      label.textContent = isHeader ? 'Header' : (el.getAttribute('data-section-label') || 'Section')
    }

    // ── Inline text editing ─────────────────────────────────────────
    function startEditing(el: HTMLElement) {
      if (el.hasAttribute('data-edit')) {
        editingEl = el
        el.contentEditable = 'true'
        el.focus()
        // Select all text
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges(); sel?.addRange(range)
        outline.style.display = 'none' // hide outline while editing
      }
    }

    function finishEditing() {
      if (!editingEl) return
      const el = editingEl
      editingEl = null
      el.contentEditable = 'false'
      outline.style.display = '' // show again

      // Support both data-section-id (section) and data-section-type="header-section" (header)
      const section = el.closest('[data-section-id]') as HTMLElement
      const isHeader = !section && el.closest('[data-section-type="header-section"]')
      let id: number | string
      if (section) {
        id = Number(section.getAttribute('data-section-id'))
      } else if (isHeader) {
        id = 'header'
      } else {
        return
      }
      const path = el.getAttribute('data-edit') || ''
      const value = el.innerText
      if (!path) return

      window.parent.postMessage({
        source: 'homeu-preview', kind: 'edit-text', id, path, value,
      }, '*')
    }

    // ── Mouse events ────────────────────────────────────────────────
    const onMove = (e: MouseEvent) => {
      if (e.target instanceof Node && outline.contains(e.target)) return
      // If inline editing is active, don't interfere
      if (editingEl) return

      // If dragging, compute target position
      if (dragRef.current) {
        const dr = dragRef.current
        const currentY = e.clientY + window.scrollY
        const sections = [...document.querySelectorAll('[data-section-id]')] as HTMLElement[]
        let dropIdx = sections.length - 1
        for (let i = 0; i < sections.length; i++) {
          const r = sections[i].getBoundingClientRect()
          const mid = r.top + window.scrollY + r.height / 2
          if (currentY < mid) { dropIdx = i; break }
        }
        // Place the dropline
        const target = sections[dropIdx]
        if (target) {
          const r = target.getBoundingClientRect()
          const above = currentY < r.top + window.scrollY + r.height / 2
          if (above) {
            dropline.style.top = `${r.top + window.scrollY}px`
          } else {
            dropline.style.top = `${r.top + window.scrollY + r.height}px`
          }
          dropline.style.display = 'block'
        }
        return
      }

      const t = targetFor(e.target)
      if (t && t !== current) { current = t; place(t) }
      else if (t) place(t)
      else { current = null; outline.style.display = 'none' }
    }

    const onClick = (e: MouseEvent) => {
      if (editingEl) return // editing in progress
      const t = targetFor(e.target)
      if (!t) return

      // Image click → postMessage for media picker
      const imgTarget = (e.target as HTMLElement).closest('[data-edit-image]') as HTMLElement | null
      if (imgTarget) {
        e.preventDefault(); e.stopPropagation()
        const section = imgTarget.closest('[data-section-id]') as HTMLElement
        if (!section) return
        const id = Number(section.getAttribute('data-section-id'))
        const path = imgTarget.getAttribute('data-edit-image') || ''
        window.parent.postMessage({
          source: 'homeu-preview', kind: 'pick-image', id, path,
        }, '*')
        highlightSection(id)
        return
      }

      // Swap button click → replace a single product slot
      const swapBtn = (e.target as HTMLElement).closest('.homeu-product-swap-btn') as HTMLElement | null
      if (swapBtn) {
        e.preventDefault(); e.stopPropagation()
        const section = swapBtn.closest('[data-section-id]') as HTMLElement
        if (!section) return
        const id = Number(section.getAttribute('data-section-id'))
        const productIndex = Number(swapBtn.getAttribute('data-product-index'))
        window.parent.postMessage({
          source: 'homeu-preview', kind: 'pick-product-slot', id, productIndex,
        }, '*')
        highlightSection(id)
        return
      }

      // Product card click (featured_products section) → postMessage for product picker
      const productLink = (e.target as HTMLElement).closest('.grid-product__link') as HTMLElement | null
      if (productLink) {
        e.preventDefault(); e.stopPropagation()
        const section = productLink.closest('[data-section-id]') as HTMLElement
        if (!section) return
        const id = Number(section.getAttribute('data-section-id'))
        const productIndex = productLink.getAttribute('data-product-index')
        window.parent.postMessage({
          source: 'homeu-preview', kind: 'pick-product', id,
          productIndex: productIndex ? Number(productIndex) : undefined,
        }, '*')
        highlightSection(id)
        return
      }

      e.preventDefault(); e.stopPropagation()
      const isHeader = t.getAttribute('data-section-type') === 'header-section'
      window.parent.postMessage({
        source: 'homeu-preview', kind: 'select',
        id: isHeader ? 'header' : Number(t.getAttribute('data-section-id')),
        sectionType: isHeader ? 'header-section' : t.getAttribute('data-section-type'),
      }, '*')
    }

    // Dblclick → inline editing
    const onDblClick = (e: MouseEvent) => {
      const editEl = (e.target as HTMLElement).closest('[data-edit]') as HTMLElement | null
      if (editEl) {
        e.preventDefault(); e.stopPropagation()
        // Select the section first
        const section = editEl.closest('[data-section-id]') as HTMLElement
        if (section) {
          const id = Number(section.getAttribute('data-section-id'))
          window.parent.postMessage({
            source: 'homeu-preview', kind: 'select',
            id, sectionType: section.getAttribute('data-section-type'),
          }, '*')
        }
        startEditing(editEl)
      }
    }

    // Finish editing on blur or Enter
    const onEditKeyDown = (e: KeyboardEvent) => {
      if (!editingEl) return
      if (e.key === 'Enter') {
        e.preventDefault()
        editingEl.blur()
      }
      if (e.key === 'Escape') {
        editingEl.contentEditable = 'false'
        editingEl = null
        outline.style.display = ''
      }
    }

    const onEditBlur = () => {
      // Small timeout so click events don't interfere
      setTimeout(() => finishEditing(), 50)
    }

    // ── Keyboard shortcut: Ctrl+Z to close editing ──────────────────
    document.addEventListener('keydown', onEditKeyDown)

    // ── Drag reorder ────────────────────────────────────────────────
    const onDragMouseDown = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.homeu-preview-dragbtn') as HTMLElement
      if (!btn) return
      e.preventDefault(); e.stopPropagation()
      if (!current) return
      const el = current
      const allSections = [...document.querySelectorAll('[data-section-id]')] as HTMLElement[]
      const midpoints = allSections.map(s => {
        const r = s.getBoundingClientRect()
        return r.top + window.scrollY + r.height / 2
      })
      dragRef.current = {
        el, startY: e.clientY + window.scrollY,
        startRect: el.getBoundingClientRect(),
        midpoints, dropline,
        draggedId: Number(el.getAttribute('data-section-id')),
      }
      outline.style.opacity = '0.5'
    }

    const onDragEnd = () => {
      const dr = dragRef.current
      if (!dr) return
      dragRef.current = null
      outline.style.opacity = '1'
      dropline.style.display = 'none'
      // Post message with new position
      const allSections = [...document.querySelectorAll('[data-section-id]')] as HTMLElement[]
      const dropY = dr.dropline.style.top ? parseInt(dr.dropline.style.top) : 0
      let toIndex = allSections.length - 1
      for (let i = 0; i < allSections.length; i++) {
        const r = allSections[i].getBoundingClientRect()
        const mid = r.top + window.scrollY + r.height / 2
        if (dropY < mid) { toIndex = i; break }
      }
      window.parent.postMessage({
        source: 'homeu-preview', kind: 'reorder',
        id: dr.draggedId, toIndex,
      }, '*')
    }

    document.addEventListener('mousedown', onDragMouseDown)
    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('mouseleave', onDragEnd) // guard: mouse leaves iframe

    // ── Parent → preview messages (highlight) ───────────────────────
    function highlightSection(id: number | string) {
      const sel = typeof id === 'number'
        ? `[data-section-id="${id}"]`
        : '[data-section-type="header-section"]'
      const el = document.querySelector(sel) as HTMLElement | null
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); place(el); current = el }
    }

    const onMessage = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.source !== 'homeu-admin') return
      if (d.kind === 'highlight') highlightSection(d.id)
    }

    // ── Listen for contentEditable events ───────────────────────────
    document.addEventListener('blur', onEditBlur, true)

    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick, true)
    document.addEventListener('dblclick', onDblClick, true)
    window.addEventListener('message', onMessage)
    window.addEventListener('scroll', () => { if (current && !editingEl) place(current) }, { passive: true })

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('dblclick', onDblClick, true)
      window.removeEventListener('message', onMessage)
      document.removeEventListener('keydown', onEditKeyDown)
      document.removeEventListener('blur', onEditBlur, true)
      document.removeEventListener('mousedown', onDragMouseDown)
      document.removeEventListener('mouseup', onDragEnd)
      document.body.classList.remove('homeu-preview-mode')
      outline.remove(); dropline.remove()
      document.querySelectorAll('.homeu-preview-insert').forEach(el => el.remove())
      swapBtnStyle.remove()
      observer.disconnect()
    }
  }, [])

  return null
}
