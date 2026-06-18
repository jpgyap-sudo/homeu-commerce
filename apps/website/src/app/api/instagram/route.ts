import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { computeGrid, type GridType } from '@/lib/grid-engine'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')
    const limit = parseInt(url.searchParams.get('limit') || '12')

    if (slug) {
      const { rows: grids } = await query(
        'SELECT * FROM instagram_grids WHERE slug = $1 AND published = true LIMIT 1', [slug]
      )
      if (grids.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const grid = grids[0]
      const { rows: cells } = await query(
        `SELECT gc.*, p.image_url, p.caption, p.alt_text, p.width, p.height, p.products, p.link
         FROM grid_cells gc
         LEFT JOIN instagram_posts p ON gc.post_id = p.id
         WHERE gc.grid_id = $1 ORDER BY gc.position`, [grid.id]
      )

      const gridCells = cells.map((c: any) => ({
        id: c.id, imageId: c.post_id, url: c.image_url, caption: c.caption,
        alt: c.alt_text, link: c.link,
        colStart: c.col_start, rowStart: c.row_start,
        colSpan: c.col_span, rowSpan: c.row_span,
        products: c.products || [],
      }))

      return NextResponse.json({
        grid: {
          id: grid.id, title: grid.title, slug: grid.slug,
          type: grid.grid_type, columns: grid.columns, rows: grid.rows,
          gap: grid.gap, config: grid.config,
        },
        cells: gridCells,
      })
    }

    // No slug: return recent posts as a default grid
    const { rows: posts } = await query(
      'SELECT id, image_url, caption, alt_text, width, height, products, link FROM instagram_posts ORDER BY sort_order, created_at DESC LIMIT $1',
      [limit]
    )

    const cells = computeGrid({
      type: 'masonry', columns: 4, rows: 4, gap: 8,
      images: posts.map((p: any) => ({ id: p.id, url: p.image_url, width: p.width || 800, height: p.height || 800, alt: p.alt_text, products: p.products || [] })),
    }).map((c: any) => ({
      ...c, caption: posts.find((pp: any) => pp.id === c.imageId)?.caption,
      link: posts.find((pp: any) => pp.id === c.imageId)?.link,
    }))

    return NextResponse.json({ grid: { type: 'masonry', columns: 4, rows: 4, gap: 8 }, cells })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
