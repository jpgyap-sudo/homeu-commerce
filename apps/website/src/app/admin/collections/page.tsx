/**
 * Admin Collections List — Shopify-style collection manager.
 * Lists collections (stored in `categories`, upgraded in place) with type
 * badge (smart/manual), product count, published + featured state.
 */

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import Link from 'next/link'

interface Row {
  id: number
  title: string
  slug: string
  image_url: string | null
  collection_type: string
  published: boolean
  featured: boolean
  position: number
  product_count: string
}

function fmt(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

export default async function AdminCollectionsPage({
  searchParams,
}: { searchParams: Promise<{ search?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const sp = await searchParams
  const search = (sp.search || '').trim()

  const values: any[] = []
  let whereSQL = ''
  if (search) {
    values.push(`%${search}%`)
    whereSQL = `WHERE LOWER(c.title) LIKE LOWER($1) OR LOWER(c.slug) LIKE LOWER($1)`
  }

  let rows: Row[] = []
  try {
    const res = await query(
      `SELECT c.id, c.title, c.slug, c.image_url, c.collection_type,
              c.published, c.featured, c.position,
              (SELECT COUNT(*) FROM collection_products cp WHERE cp.collection_id = c.id) AS product_count
       FROM categories c ${whereSQL}
       ORDER BY c.position ASC, c.title ASC`,
      values
    )
    rows = res.rows as Row[]
  } catch (e) {
    rows = []
  }

  const smartCount = rows.filter(r => r.collection_type === 'smart').length
  const manualCount = rows.length - smartCount

  return (
    <main style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#151a17' }}>Collections</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            {rows.length} collections · {smartCount} smart · {manualCount} manual
          </p>
        </div>
        <Link href="/admin/collections/new" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px',
          background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff',
          borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 14px rgba(26,109,62,0.35)',
        }}>+ Create collection</Link>
      </div>

      <form method="GET" action="/admin/collections" style={{ display: 'flex', gap: 12, margin: '24px 0' }}>
        <input
          type="text" name="search" defaultValue={search}
          placeholder="Search collections…"
          style={{ flex: '1 1 280px', padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10, fontSize: 14, background: '#f7f9f6', color: '#151a17', outline: 'none' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#151a17', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Search</button>
        {search && <Link href="/admin/collections" style={{ padding: '10px 16px', color: '#667168', fontSize: 14, textDecoration: 'none' }}>Clear</Link>}
      </form>

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #d9e0d7', background: '#f7f9f6' }}>
              {['', 'Title', 'Type', 'Products', 'Visibility', 'Updated'].map((h, n) => (
                <th key={n} style={{ textAlign: n === 3 ? 'center' : 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#667168' }}>No collections found.</td></tr>
            ) : rows.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eef1ed' }}>
                <td style={{ padding: '10px 16px', width: 56 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#eef1ed', backgroundImage: c.image_url ? `url(${c.image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Link href={`/admin/collections/${c.id}`} style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 600 }}>{c.title}</Link>
                  <div style={{ fontSize: 12, color: '#9aa69c' }}>/{c.slug}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: c.collection_type === 'smart' ? '#e8f0fe' : '#f0ece4',
                    color: c.collection_type === 'smart' ? '#1a56db' : '#7a6a4f',
                  }}>{c.collection_type === 'smart' ? '⚡ Smart' : '✋ Manual'}</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{Number(c.product_count)}</td>
                <td style={{ padding: '12px 16px' }}>
                  {c.published
                    ? <span style={{ color: '#1e7a47', fontWeight: 600, fontSize: 13 }}>● Published</span>
                    : <span style={{ color: '#b0392f', fontWeight: 600, fontSize: 13 }}>○ Hidden</span>}
                  {c.featured && <span style={{ marginLeft: 8, fontSize: 11, color: '#b8860b' }}>★ Featured</span>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#667168' }}>
                  <Link href={`/admin/collections/${c.id}`} style={{ color: '#1a6d3e', textDecoration: 'none' }}>Edit →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/admin/dashboard" style={{ color: '#667168', fontSize: 14 }}>← Back to Dashboard</Link>
      </p>
    </main>
  )
}
