import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { unstable_cache } from 'next/cache'

async function loadLeads() {
  try {
    const [sources, scores, trend, buyerTypes, statuses, daily] = await Promise.all([
      query(`SELECT COALESCE(NULLIF(source_page,''),'Direct') as s, COUNT(*) as c FROM chatbot.leads GROUP BY s ORDER BY c DESC LIMIT 10`),
      query(`SELECT CASE WHEN score >= 70 THEN 'Hot' WHEN score >= 40 THEN 'Warm' WHEN score >= 1 THEN 'Cool' ELSE 'Unscored' END as l, COUNT(*) as c, CASE WHEN score >= 70 THEN '#e74b16' WHEN score >= 40 THEN '#d4a017' WHEN score >= 1 THEN '#3498db' ELSE '#a09c96' END as clr FROM chatbot.leads GROUP BY l, clr ORDER BY c DESC`),
      query(`SELECT TO_CHAR(DATE_TRUNC('week',created_at),'Mon DD') as w, COUNT(*) as c FROM chatbot.leads WHERE created_at >= NOW() - INTERVAL '8 weeks' GROUP BY DATE_TRUNC('week',created_at) ORDER BY DATE_TRUNC('week',created_at)`),
      query(`SELECT COALESCE(buyer_type,'Unknown') as t, COUNT(*) as c FROM chatbot.leads GROUP BY t ORDER BY c DESC`),
      query(`SELECT status, COUNT(*) as c FROM chatbot.leads GROUP BY status ORDER BY c DESC`),
      query(`SELECT DATE(created_at) as d, COUNT(*) as c FROM chatbot.leads WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY d ORDER BY d`),
    ])
    return {
      sources: sources.rows.map((r: any) => ({ s: r.s, c: Number(r.c) })),
      scores: scores.rows.map((r: any) => ({ l: r.l, c: Number(r.c), clr: r.clr })),
      trend: trend.rows.map((r: any) => ({ w: r.w, c: Number(r.c) })),
      buyerTypes: buyerTypes.rows.map((r: any) => ({ t: r.t, c: Number(r.c) })),
      statuses: statuses.rows.map((r: any) => ({ s: r.status, c: Number(r.c) })),
      daily: daily.rows.map((r: any) => ({ d: String(r.d || '').slice(0, 10), c: Number(r.c) })),
    }
  } catch (error) { return { sources: [], scores: [], trend: [], buyerTypes: [], statuses: [], daily: [], error: error instanceof Error ? error.message : 'Lead analytics query failed' } }
}

const getLeads = unstable_cache(loadLeads, ['analytics-leads'], { revalidate: 120, tags: ['admin-analytics'] })

export default async function LeadsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const d = await getLeads()
  const maxSrc = Math.max(...d.sources.map(x => x.c), 1)
  const maxScore = Math.max(...d.scores.map(x => x.c), 1)
  const maxBuyer = Math.max(...d.buyerTypes.map(x => x.c), 1)
  const maxStatus = Math.max(...d.statuses.map(x => x.c), 1)

  return (
    <div style={{ padding: 24, maxWidth: 1320 }}>
      {'error' in d && d.error && <div role="alert" style={{ marginBottom: 16, padding: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 8 }}>Lead analytics could not be loaded: {d.error}</div>}
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>👤 Leads & CRM Analytics</h1>
      <p style={{ color: '#667168', fontSize: 13, marginBottom: 24 }}>Lead sources, scoring, buyer types, and status breakdown</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card title="Lead Sources">
          {d.sources.map((x, i) => <Bar key={i} label={x.s} value={x.c} max={maxSrc} color="#3498db" />)}
        </Card>
        <Card title="Lead Score Distribution">
          {d.scores.map((x, i) => <Bar key={i} label={x.l} value={x.c} max={maxScore} color={x.clr} />)}
        </Card>
        <Card title="Buyer Types">
          {d.buyerTypes.map((x, i) => <Bar key={i} label={x.t} value={x.c} max={maxBuyer} color="#1a6d3e" />)}
        </Card>
        <Card title="Lead Statuses">
          {d.statuses.map((x, i) => <Bar key={i} label={x.s} value={x.c} max={maxStatus} color={x.s === 'new' ? '#3498db' : x.s === 'won' ? '#1a6d3e' : x.s === 'lost' ? '#e74b16' : '#667168'} />)}
        </Card>
      </div>

      <Card title="Weekly Lead Trend (8 Weeks)">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
          {d.trend.map((x, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 9, color: '#667168', marginBottom: 3 }}>{x.c}</div>
              <div style={{ width: '100%', maxWidth: 40, height: `${Math.max(...d.trend.map(y => y.c), 1) > 0 ? (x.c / Math.max(...d.trend.map(y => y.c), 1)) * 110 : 0}px`, minHeight: x.c > 0 ? 4 : 0, background: '#e74b16', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
              <div style={{ fontSize: 9, color: '#667168', marginTop: 5, transform: 'rotate(-40deg)', whiteSpace: 'nowrap', transformOrigin: 'left' }}>{x.w}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#151a17' }}>{label}</span>
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
