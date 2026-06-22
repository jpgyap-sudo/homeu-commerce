import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { computeGrid, GRID_TEMPLATES, type GridType } from '@/lib/grid-engine'

export async function GET() {
  const session = await getSession()
  if (!session || session.role === 'customer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { rows: grids } = await query('SELECT * FROM instagram_grids ORDER BY updated_at DESC')
    return NextResponse.json({ grids, templates: Object.entries(GRID_TEMPLATES).map(([k,v]) => ({ id: k, ...v })) })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'customer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { title, slug, grid_type, columns, rows, gap, config, post_ids, display_on } = body
    const { rows: gridRows } = await query(
      `INSERT INTO instagram_grids (title, slug, grid_type, columns, rows, gap, config, display_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, slug, grid_type||'masonry', columns||4, rows||4, gap||8, JSON.stringify(config||{}), display_on||['homepage']]
    )
    const grid = gridRows[0]

    if (post_ids && post_ids.length > 0) {
      const { rows: posts } = await query(
        `SELECT id, image_url, caption, alt_text, width, height, products FROM instagram_posts WHERE id = ANY($1)`, [post_ids]
      )
      const cells = computeGrid({
        type: (grid_type||'masonry') as GridType, columns: columns||4, rows: rows||4, gap: gap||8,
        images: posts.map((p: any) => ({ id: p.id, url: p.image_url, width: p.width||800, height: p.height||800, alt: p.alt_text, products: p.products||[] })),
      })
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        await query(
          `INSERT INTO grid_cells (grid_id, post_id, position, col_span, row_span, col_start, row_start) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [grid.id, c.imageId, i, c.colSpan, c.rowSpan, c.colStart, c.rowStart]
        )
      }
    }
    return NextResponse.json({ grid })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'customer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, published, status, title, grid_type, columns, rows, gap, display_on } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const sets: string[] = []; const vals: any[] = []; let i = 1
    if (published !== undefined) { sets.push(`published=$${i++}`); vals.push(published) }
    if (status) { sets.push(`status=$${i++}`); vals.push(status) }
    if (title) { sets.push(`title=$${i++}`); vals.push(title) }
    if (grid_type) { sets.push(`grid_type=$${i++}`); vals.push(grid_type) }
    if (columns) { sets.push(`columns=$${i++}`); vals.push(columns) }
    if (rows) { sets.push(`rows=$${i++}`); vals.push(rows) }
    if (gap !== undefined) { sets.push(`gap=$${i++}`); vals.push(gap) }
    if (display_on) { sets.push(`display_on=$${i++}`); vals.push(display_on) }
    sets.push(`updated_at=NOW()`)
    if (sets.length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })

    vals.push(id)
    const { rows: updated } = await query(`UPDATE instagram_grids SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, vals)
    return NextResponse.json({ grid: updated[0] })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'customer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await query('DELETE FROM grid_cells WHERE grid_id=$1', [id])
    await query('DELETE FROM instagram_grids WHERE id=$1', [id])
    return NextResponse.json({ success: true })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
