'use client'

import { useState, useEffect } from 'react'
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
}

export default function InstagramFeed({ slug, limit = 12, columns = 4, gap = 8, className = '' }: Props) {
  const [cells, setCells] = useState<Cell[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const url = slug ? `/api/instagram?slug=${slug}&limit=${limit}` : `/api/instagram?limit=${limit}`
    fetch(url).then(r => r.json()).then(d => {
      setCells(d.cells || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [slug, limit])

  if (!loaded) return <div className="instagram-feed-loading" style={{ display:'grid', gridTemplateColumns:`repeat(${columns},1fr)`, gap }}>{Array.from({length:6}).map((_,i) => <div key={i} style={{ aspectRatio:'1', background:'var(--luxe-warm-200)', borderRadius:8, animation:'luxeShimmer 2s infinite' }} />)}</div>
  if (cells.length === 0) return null

  const maxRow = Math.max(...cells.map(c => c.rowStart + c.rowSpan), 1)
  const maxCol = Math.max(...cells.map(c => c.colStart + c.colSpan), columns)

  return (
    <section className={`instagram-feed ${className}`}>
      <div className="instagram-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${maxCol}, 1fr)`,
          gridTemplateRows: `repeat(${maxRow}, 1fr)`,
          gap: `${gap}px`,
        }}>
        {cells.map(cell => (
          <InstagramCell key={cell.id} cell={cell} />
        ))}
      </div>
    </section>
  )
}

function InstagramCell({ cell }: { cell: Cell }) {
  const [hover, setHover] = useState(false)
  const Wrapper = cell.link ? 'a' : 'div'

  return (
    <Wrapper
      href={cell.link || undefined}
      target={cell.link ? '_blank' : undefined}
      rel={cell.link ? 'noopener' : undefined}
      style={{
        gridColumn: `${cell.colStart + 1} / span ${cell.colSpan}`,
        gridRow: `${cell.rowStart + 1} / span ${cell.rowSpan}`,
        position: 'relative', overflow: 'hidden', borderRadius: 8,
        cursor: cell.link ? 'pointer' : 'default',
        display: 'block', textDecoration: 'none', color: 'inherit',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img
        src={cell.url}
        alt={cell.alt || cell.caption || 'Instagram post'}
        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform 400ms ease' }}
        loading="lazy"
      />

      {/* Hover overlay with caption + shoppable tags */}
      {hover && (
        <div style={{
          position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
          display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:12,
          transition:'opacity 200ms ease',
        }}>
          {cell.caption && (
            <p style={{ color:'#fff', fontSize:12, lineHeight:1.4, margin:'0 0 8px', fontWeight:400 }}>{cell.caption.substring(0, 100)}</p>
          )}
          {cell.products && cell.products.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {cell.products.map(p => (
                <Link key={p.id} href={`/products/${p.handle || p.id}`}
                  style={{ background:'#fff', color:'#000', fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:999, textDecoration:'none' }}>
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
