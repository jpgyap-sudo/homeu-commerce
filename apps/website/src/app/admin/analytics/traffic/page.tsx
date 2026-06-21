import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { unstable_cache } from 'next/cache'

async function loadTraffic() {
  try {
    const [daily, monthly, hourly, referrers, topPages] = await Promise.all([
      query(`SELECT DATE(created_at) as d, COUNT(*) as c, COUNT(DISTINCT visitor_id) as u FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '14 days' GROUP BY d ORDER BY d`),
      query(`SELECT TO_CHAR(created_at,'Mon YYYY') as m, COUNT(*) as c, COUNT(DISTINCT visitor_id) as u FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '6 months' GROUP BY m ORDER BY MIN(created_at)`),
      query(`SELECT EXTRACT(HOUR FROM created_at)::int as h, COUNT(*) as c FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '30 days' GROUP BY h ORDER BY h`),
      query(`SELECT COALESCE(NULLIF(SPLIT_PART(referrer,'/',3),''),'Direct') as s, COUNT(*) as c FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '30 days' GROUP BY s ORDER BY c DESC LIMIT 10`),
      query(`SELECT path, COUNT(*) as c, COUNT(DISTINCT visitor_id) as u FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '30 days' GROUP BY path ORDER BY c DESC LIMIT 20`),
    ])
    return {
      daily: daily.rows.map((r: any) => ({ d: String(r.d || '').slice(0, 10), c: Number(r.c), u: Number(r.u) })),
      monthly: monthly.rows.map((r: any) => ({ m: r.m, c: Number(r.c), u: Number(r.u) })),
      hourly: hourly.rows.map((r: any) => ({ h: Number(r.h), c: Number(r.c) })),
      referrers: referrers.rows.map((r: any) => ({ s: r.s, c: Number(r.c) })),
      topPages: topPages.rows.map((r: any) => ({ path: r.path, c: Number(r.c), u: Number(r.u) })),
    }
  } catch (error) { return { daily: [], monthly: [], hourly: [], referrers: [], topPages: [], error: error instanceof Error ? error.message : 'Traffic query failed' } }
}

const getTraffic = unstable_cache(loadTraffic, ['analytics-traffic'], { revalidate: 120, tags: ['admin-analytics'] })

export default async function TrafficPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const d = await getTraffic()

  const maxH = Math.max(...d.hourly.map(x => x.c), 1)
  const maxRef = Math.max(...d.referrers.map(x => x.c), 1)
  const maxPage = Math.max(...d.topPages.map(x => x.c), 1)

  return (
    <div style={{ padding: 24, maxWidth: 1320 }}>
      {'error' in d && d.error && <div role="alert" style={{ marginBottom: 16, padding: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 8 }}>Traffic analytics could not be loaded: {d.error}</div>}
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>👁️ Traffic Analytics</h1>
      <p style={{ color: '#667168', fontSize: 13, marginBottom: 24 }}>Page views, visitors, sources, and time-of-day patterns</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card title="Daily Page Views (14 Days)">
          <BarChart data={d.daily.map(x => ({ l: x.d.slice(5), v: x.c }))} max={Math.max(...d.daily.map(x => x.c), 1)} color="#1a6d3e" />
        </Card>
        <Card title="Monthly Traffic (6 Months)">
          <BarChart data={d.monthly.map(x => ({ l: x.m, v: x.c }))} max={Math.max(...d.monthly.map(x => x.c), 1)} color="#1a5bb5" />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }}>
        <Card title="⏰ Hourly Heatmap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {d.hourly.map(x => {
              const intensity = maxH > 0 ? x.c / maxH : 0
              return (
                <div key={x.h} style={{ textAlign: 'center' }}>
                  <div style={{ height: 36, borderRadius: 6, background: `rgba(26,109,62,${0.06 + intensity * 0.9})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: intensity > 0.45 ? '#fff' : '#151a17' }}>{x.c}</div>
                  <div style={{ fontSize: 9, color: '#667168', marginTop: 2 }}>{x.h}:00</div>
                </div>
              )
            })}
          </div>
        </Card>
        <Card title="🔗 Top Referrers (30 Days)">
          {d.referrers.map((r, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: '#151a17', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.s}</span>
                <span style={{ color: '#667168', fontWeight: 600 }}>{r.c}</span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${(r.c / maxRef) * 100}%`, background: '#1a5bb5', height: '100%', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card title="📄 Top Pages (30 Days)">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #d9e0d7' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#667168', textTransform: 'uppercase' }}>Page</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#667168', textTransform: 'uppercase' }}>Views</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#667168', textTransform: 'uppercase' }}>Unique</th>
              <th style={{ padding: '8px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {d.topPages.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eef1ed' }}>
                <td style={{ padding: '8px 12px' }}>
                  <a href={p.path} style={{ color: '#1a6d3e', textDecoration: 'none', fontSize: 12 }} target="_blank" rel="noopener">{p.path}</a>
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{p.c.toLocaleString()}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#667168' }}>{p.u.toLocaleString()}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ width: `${(p.c / maxPage) * 120}px`, height: 6, background: '#1a5bb5', borderRadius: 3, opacity: 0.6 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 20 }}><h3 style={{ fontSize: 14, fontWeight: 600, color: '#151a17', margin: '0 0 14px' }}>{title}</h3>{children}</div>
}

function BarChart({ data, max, color }: { data: { l: string; v: number }[]; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, paddingTop: 4 }}>
      {data.map((x, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 9, color: '#667168', marginBottom: 3 }}>{x.v || ''}</div>
          <div style={{ width: '100%', maxWidth: 36, height: `${max > 0 ? (x.v / max) * 100 : 0}%`, minHeight: x.v > 0 ? 4 : 0, background: color, borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
          <div style={{ fontSize: 9, color: '#667168', marginTop: 5, transform: 'rotate(-40deg)', whiteSpace: 'nowrap', transformOrigin: 'left' }}>{x.l}</div>
        </div>
      ))}
    </div>
  )
}
