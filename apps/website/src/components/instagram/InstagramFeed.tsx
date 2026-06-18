'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Cell {
  id: number; imageId: number; url: string; caption?: string; link?: string; alt?: string
  colSpan: number; rowSpan: number; colStart: number; rowStart: number
  products?: { id: number; title: string; handle: string }[]
}

interface Props {
  slug?: string
  limit?: number
  columns?: number
  gap?: number
  className?: string
  showCaption?: boolean
  lazyLoad?: boolean
}

export default function InstagramFeed({
  slug, limit = 12, columns = 4, gap = 8, className = '',
  showCaption = true, lazyLoad = true,
}: Props) {
  const [cells, setCells] = useState<Cell[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const [mobileCols, setMobileCols] = useState(columns > 2 ? 2 : columns)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setMobileCols(mq.matches ? (columns > 2 ? 2 : columns) : columns)
    const handler = (e: MediaQueryListEvent) => setMobileCols(e.matches ? (columns > 2 ? 2 : columns) : columns)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [columns])

  useEffect(() => {
    const url = slug ? `/api/instagram?slug=${slug}&limit=${limit}` : `/api/instagram?limit=${limit}`
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setCells(d.cells || []); setLoaded(true) })
      .catch(e => { setError(e.message); setLoaded(true) })
  }, [slug, limit])

  if (!loaded) {
    return (
      <section className={`instagram-feed instagram-feed--loading ${className}`} ref={sectionRef}>
        <div className="instagram-grid instagram-grid--skeleton"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${mobileCols}, 1fr)`, gap: `${gap}px` }}>
          {Array.from({ length: Math.min(limit, mobileCols * 2) }).map((_, i) => (
            <div key={i} className="instagram-skeleton-cell"
              style={{ aspectRatio: '1', borderRadius: 'var(--radius-md, 8px)', background: 'var(--color-warm-200, #e8e4dc)' }}>
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--color-warm-200, #e8e4dc) 0%, var(--color-warm-100, #f5f2ed) 50%, var(--color-warm-200, #e8e4dc) 100%)', backgroundSize: '200% 100%', animation: 'instagramShimmer 2s infinite', borderRadius: 'inherit' }} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={`instagram-feed instagram-feed--error ${className}`}>
        <div className="instagram-feed-error">
          <span>📸</span>
          <p>Instagram feed unavailable</p>
        </div>
      </section>
    )
  }

  if (cells.length === 0) return null

  const activeCols = columns > 4 ? Math.min(columns, mobileCols * 2) : mobileCols
  const maxRow = Math.max(...cells.map(c => c.rowStart + c.rowSpan), 1)
  const maxCol = Math.max(...cells.map(c => c.colStart + c.colSpan), activeCols)

  return (
    <section className={`instagram-feed ${className}`} ref={sectionRef}>
      {/* Section heading — can be overridden by theme */}
      <style>{`
        @keyframes instagramShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .instagram-grid {
          display: grid;
          gap: ${gap}px;
          grid-template-columns: repeat(${activeCols}, 1fr);
        }
        .instagram-cell {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-md, 8px);
          display: block;
          text-decoration: none;
          color: inherit;
        }
        .instagram-cell:hover .instagram-cell-image {
          transform: scale(1.04);
        }
        .instagram-cell-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .instagram-cell-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 12px;
          opacity: 0;
          transition: opacity 250ms ease;
          pointer-events: none;
        }
        .instagram-cell:hover .instagram-cell-overlay {
          opacity: 1;
        }
        .instagram-cell-caption {
          color: #fff;
          font-size: 12px;
          line-height: 1.4;
          margin: 0 0 8px;
          font-weight: 400;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .instagram-cell-products {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          pointer-events: auto;
        }
        .instagram-cell-product-tag {
          background: #fff;
          color: #111;
          font-size: 10px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          text-decoration: none;
          transition: transform 150ms ease;
        }
        .instagram-cell-product-tag:hover {
          transform: translateY(-2px);
        }
        .instagram-feed-error {
          text-align: center;
          padding: 32px;
          color: var(--color-text-secondary, #7d7a75);
          font-size: 14px;
        }
        .instagram-feed-error span { font-size: 32px; display: block; margin-bottom: 8px; }
        .instagram-skeleton-cell { overflow: hidden; }
        @media (max-width: 768px) {
          .instagram-grid { grid-template-columns: repeat(${mobileCols}, 1fr); }
          .instagram-cell-overlay { opacity: 1; background: linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 40%); }
          .instagram-cell-caption { font-size: 10px; -webkit-line-clamp: 2; }
          .instagram-cell-product-tag { font-size: 9px; padding: 3px 7px; }
        }
      `}</style>
      <div className="instagram-grid" style={{
        gridTemplateRows: `repeat(${maxRow}, 1fr)`,
      }}>
        {cells.map(cell => (
          <InstagramCell key={cell.id} cell={cell} showCaption={showCaption} lazyLoad={lazyLoad} />
        ))}
      </div>
    </section>
  )
}

function InstagramCell({ cell, showCaption, lazyLoad }: { cell: Cell; showCaption: boolean; lazyLoad: boolean }) {
  const Wrapper = cell.link ? 'a' : 'div'
  const hasOverlay = showCaption && (cell.caption || (cell.products && cell.products.length > 0))

  return (
    <Wrapper
      href={cell.link || undefined}
      target={cell.link ? '_blank' : undefined}
      rel={cell.link ? 'noopener noreferrer' : undefined}
      className="instagram-cell"
      style={{
        gridColumn: `${cell.colStart + 1} / span ${cell.colSpan}`,
        gridRow: `${cell.rowStart + 1} / span ${cell.rowSpan}`,
      }}
    >
      <img
        src={cell.url}
        alt={cell.alt || cell.caption || 'Instagram post'}
        className="instagram-cell-image"
        loading={lazyLoad ? 'lazy' : undefined}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />

      {hasOverlay && (
        <div className="instagram-cell-overlay">
          {showCaption && cell.caption && (
            <p className="instagram-cell-caption">{cell.caption}</p>
          )}
          {cell.products && cell.products.length > 0 && (
            <div className="instagram-cell-products">
              {cell.products.map(p => (
                <Link key={p.id} href={`/products/${p.handle || p.id}`} className="instagram-cell-product-tag">
                  🛒 {p.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </Wrapper>
  )
}
