import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { unstable_cache } from 'next/cache'

async function loadProducts() {
  try {
    const [topRFQ, topViews, categories, messages] = await Promise.all([
      query(`SELECT product_title as t, COUNT(*) as c FROM chatbot.rfq_items GROUP BY t ORDER BY c DESC LIMIT 12`),
      query(`SELECT SPLIT_PART(path,'/',3) as id, COUNT(*) as c FROM page_views WHERE is_admin = FALSE AND path LIKE '/products/%' AND created_at >= NOW() - INTERVAL '30 days' GROUP BY id ORDER BY c DESC LIMIT 12`),
      query(`SELECT c.title as t, COUNT(ri.id) as cnt FROM categories c LEFT JOIN products p ON p.category_id = c.id LEFT JOIN chatbot.rfq_items ri ON ri.product_title = p.title GROUP BY c.title ORDER BY cnt DESC LIMIT 8`),
      query(`SELECT DATE(created_at) as d, COUNT(*) as c FROM chatbot.messages WHERE created_at >= NOW() - INTERVAL '14 days' GROUP BY d ORDER BY d`),
    ])
    return {
      topRFQ: topRFQ.rows.map((r: any) => ({ t: r.t || 'Unknown', c: Number(r.c) })),
      topViews: topViews.rows.map((r: any) => ({ t: r.id || '', c: Number(r.c) })),
      categories: categories.rows.map((r: any) => ({ t: r.t || 'Uncategorized', c: Number(r.cnt) })),
      messages: messages.rows.map((r: any) => ({ d: String(r.d || '').slice(0, 10), c: Number(r.c) })),
    }
  } catch (error) { return { topRFQ: [], topViews: [], categories: [], messages: [], error: error instanceof Error ? error.message : 'Product analytics query failed' } }
}

const getProducts = unstable_cache(loadProducts, ['analytics-products'], { revalidate: 120, tags: ['admin-analytics'] })

export default async function ProductsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const d = await getProducts()

  return (
    <div style={{ padding: 24, maxWidth: 1320 }}>
      {'error' in d && d.error && <div role="alert" style={{ marginBottom: 16, padding: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 8 }}>Product analytics could not be loaded: {d.error}</div>}
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>🛋️ Product Analytics</h1>
      <p style={{ color: '#667168', fontSize: 13, marginBottom: 24 }}>Which products get viewed, requested, and which categories perform best</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card title="Most Requested (RFQ)">
          {d.topRFQ.map((x, i) => <Bar key={i} label={x.t} value={x.c} max={Math.max(...d.topRFQ.map(y => y.c), 1)} color="#e74b16" />)}
        </Card>
        <Card title="Most Viewed Products (30d)">
          {d.topViews.map((x, i) => <Bar key={i} label={x.t} value={x.c} max={Math.max(...d.topViews.map(y => y.c), 1)} color="#1a5bb5" />)}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="Category Performance">
          {d.categories.map((x, i) => <Bar key={i} label={x.t} value={x.c} max={Math.max(...d.categories.map(y => y.c), 1)} color="#1a6d3e" />)}
        </Card>
        <Card title="Chat Messages (14 Days)">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
            {d.messages.map((x, i) => {
              const maxM = Math.max(...d.messages.map(y => y.c), 1)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 9, color: '#667168', marginBottom: 3 }}>{x.c || ''}</div>
                  <div style={{ width: '100%', maxWidth: 36, height: `${(x.c / maxM) * 110}px`, minHeight: x.c > 0 ? 4 : 0, background: '#9b59b6', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
                  <div style={{ fontSize: 9, color: '#667168', marginTop: 5, transform: 'rotate(-40deg)', whiteSpace: 'nowrap', transformOrigin: 'left' }}>{x.d.slice(5)}</div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#151a17', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ color: '#667168', fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 6, height: 20, overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, background: color, height: '100%', borderRadius: 6, minWidth: value > 0 ? 4 : 0 }} />
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 20 }}><h3 style={{ fontSize: 14, fontWeight: 600, color: '#151a17', margin: '0 0 14px' }}>{title}</h3>{children}</div>
}
