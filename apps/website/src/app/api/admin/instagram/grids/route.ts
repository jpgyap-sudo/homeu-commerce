import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { computeGrid, GRID_TEMPLATES, type GridType } from '@/lib/grid-engine'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { rows: grids } = await query('SELECT * FROM instagram_grids ORDER BY updated_at DESC')
    return NextResponse.json({ grids, templates: Object.entries(GRID_TEMPLATES).map(([k, v]) => ({ id: k, ...v })) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { title, slug, grid_type, columns, rows, gap, config, post_ids } = body

    const { rows: gridRows } = await query(
      `INSERT INTO instagram_grids (title, slug, grid_type, columns, rows, gap, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, slug, grid_type || 'masonry', columns || 4, rows || 4, gap || 8, JSON.stringify(config || {})]
    )
    const grid = gridRows[0]

    // If post_ids provided, create cells with computed layout
    if (post_ids && post_ids.length > 0) {
      const { rows: posts } = await query(
        `SELECT id, image_url, caption, alt_text, width, height, products
         FROM instagram_posts WHERE id = ANY($1)`,
        [post_ids]
      )

      const cells = computeGrid({
        type: grid_type as GridType,
        columns: columns || 4, rows: rows || 4, gap: gap || 8,
        images: posts.map((p: any) => ({
          id: p.id, url: p.image_url, width: p.width || 800, height: p.height || 800,
          alt: p.alt_text, products: p.products || [],
        })),
      })

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        await query(
          `INSERT INTO grid_cells (grid_id, post_id, position, col_span, row_span, col_start, row_start)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [grid.id, c.imageId, i, c.colSpan, c.rowSpan, c.colStart, c.rowStart]
        )
      }
    }

    return NextResponse.json({ grid })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
