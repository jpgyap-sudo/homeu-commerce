import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import Link from 'next/link'

export const metadata = { title: 'Blogs — DaVinciOS' }
export const dynamic = 'force-dynamic'

interface Row {
  id: number; title: string; handle: string; blog_title: string | null
  author_name: string | null; published_at: string | null; image_url: string | null
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return iso }
}

export default async function AdminBlogsPage({ searchParams }: { searchParams: Promise<{ blog?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const sp = await searchParams

  const blogsRes = await query(
    `SELECT b.id, b.title, (SELECT COUNT(*) FROM articles a WHERE a.blog_id = b.id) AS cnt FROM blogs b ORDER BY b.title ASC`, []
  ).catch(() => ({ rows: [] as any[] }))

  const vals: any[] = []
  let where = ''
  if (sp.blog) { vals.push(sp.blog); where = 'WHERE a.blog_id = $1' }

  const res = await query(
    `SELECT a.id, a.title, a.handle, a.author_name, a.published_at, a.image_url, b.title AS blog_title
     FROM articles a LEFT JOIN blogs b ON b.id = a.blog_id
     ${where}
     ORDER BY a.published_at DESC NULLS LAST, a.id DESC`,
    vals
  ).catch(() => ({ rows: [] as Row[] }))
  const rows = res.rows as Row[]

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#151a17' }}>Blogs</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>{rows.length} articles across {blogsRes.rows.length} blogs</p>
        </div>
        <Link href="/admin/blogs/new" style={{ padding: '11px 24px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 14px rgba(26,109,62,0.35)' }}>+ New article</Link>
      </div>

      {/* Blog filter chips */}
      <div style={{ display: 'flex', gap: 8, margin: '20px 0', flexWrap: 'wrap' }}>
        <Link href="/admin/blogs" style={chip(!sp.blog)}>All</Link>
        {blogsRes.rows.map((b: any) => (
          <Link key={b.id} href={`/admin/blogs?blog=${b.id}`} style={chip(sp.blog === String(b.id))}>{b.title} ({b.cnt})</Link>
        ))}
      </div>

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #d9e0d7', background: '#f7f9f6' }}>
              {['', 'Title', 'Blog', 'Author', 'Published'].map((h, n) => (
                <th key={n} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#667168' }}>No articles yet.</td></tr>
            ) : rows.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #eef1ed' }}>
                <td style={{ padding: '10px 16px', width: 64 }}>
                  <div style={{ width: 48, height: 36, borderRadius: 6, background: '#eef1ed', backgroundImage: a.image_url ? `url(${a.image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Link href={`/admin/blogs/${a.id}`} style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 600 }}>{a.title}</Link>
                </td>
                <td style={{ padding: '12px 16px', color: '#667168', fontSize: 13 }}>{a.blog_title || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#667168', fontSize: 13 }}>{a.author_name || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#667168', fontSize: 12 }}>{fmt(a.published_at)}</td>
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

function chip(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none',
    background: active ? '#1a6d3e' : '#fff', color: active ? '#fff' : '#3a4339',
    border: active ? 'none' : '1.5px solid #d9e0d7',
  }
}
