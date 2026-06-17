import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { unstable_cache } from 'next/cache'

async function loadPipeline() {
  try {
    const [funnel, rfqStatus, weekly, locations, quotations] = await Promise.all([
      query(`SELECT 'Leads' as s, COUNT(*) as c FROM chatbot.leads UNION ALL SELECT 'RFQ Submitted', COUNT(*) FROM chatbot.rfq_carts WHERE status != 'draft' UNION ALL SELECT 'Quotations', COUNT(*) FROM rfq_requests UNION ALL SELECT 'Appointments', COUNT(*) FROM chatbot.appointments UNION ALL SELECT 'Won', COUNT(*) FROM chatbot.rfq_carts WHERE status='closed'`),
      query(`SELECT status, COUNT(*) as c FROM chatbot.rfq_carts GROUP BY status ORDER BY c DESC`),
      query(`SELECT TO_CHAR(DATE_TRUNC('week',l.created_at),'Mon DD') as w, COUNT(DISTINCT l.id) as leads, COUNT(DISTINCT r.id) as rfqs FROM chatbot.leads l LEFT JOIN chatbot.rfq_carts r ON r.lead_id=l.id AND r.status!='draft' WHERE l.created_at >= NOW() - INTERVAL '8 weeks' GROUP BY DATE_TRUNC('week',l.created_at) ORDER BY DATE_TRUNC('week',l.created_at)`),
      query(`SELECT COALESCE(NULLIF(delivery_location,''),'Not specified') as loc, COUNT(*) as c FROM chatbot.rfq_carts WHERE delivery_location IS NOT NULL GROUP BY delivery_location ORDER BY c DESC LIMIT 8`),
      query(`SELECT status, COUNT(*) as c FROM rfq_requests GROUP BY status ORDER BY c DESC`),
    ])
    return {
      funnel: funnel.rows.map((r: any) => ({ s: r.s, c: Number(r.c) })),
      rfqStatus: rfqStatus.rows.map((r: any) => ({ s: r.status, c: Number(r.c) })),
      weekly: weekly.rows.map((r: any) => ({ w: r.w, leads: Number(r.leads), rfqs: Number(r.rfqs), rate: Number(r.leads) > 0 ? Math.round((Number(r.rfqs) / Number(r.leads)) * 100) : 0 })),
      locations: locations.rows.map((r: any) => ({ loc: r.loc, c: Number(r.c) })),
      quotations: quotations.rows.map((r: any) => ({ s: r.status, c: Number(r.c) })),
    }
  } catch { return { funnel: [], rfqStatus: [], weekly: [], locations: [], quotations: [] } }
}

const getPipeline = unstable_cache(loadPipeline, ['analytics-pipeline'], { revalidate: 120, tags: ['admin-analytics'] })

export default async function PipelinePage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const d = await getPipeline()
  const colors: Record<string, string> = { leads: '#3498db', 'RFQ Submitted': '#f39c12', Quotations: '#27ae60', Appointments: '#9b59b6', Won: '#1a6d3e' }

  return (
    <div style={{ padding: 24, maxWidth: 1320 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>💰 Sales Pipeline</h1>
      <p style={{ color: '#667168', fontSize: 13, marginBottom: 24 }}>RFQ lifecycle, conversion rates, and delivery locations</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card title="Conversion Funnel">
          {d.funnel.map((f, i) => {
            const maxF = Math.max(...d.funnel.map(x => x.c), 1)
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#151a17', fontWeight: 600 }}>{f.s}</span>
                  <span style={{ color: '#667168' }}>{f.c.toLocaleString()}</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 6, height: 28, overflow: 'hidden' }}>
                  <div style={{ width: `${(f.c / maxF) * 100}%`, background: colors[f.s] || '#667168', height: '100%', borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                    {f.c > 0 && i < d.funnel.length - 1 && (
                      <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>
                        {d.funnel[i + 1] ? Math.round((d.funnel[i + 1].c / f.c) * 100) : 0}% → {d.funnel[i + 1]?.s || ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </Card>
        <Card title="Weekly Conversion Trend">
          <div style={{ display: 'grid', gap: 8 }}>
            {d.weekly.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 55, color: '#667168', fontSize: 11 }}>{w.w}</span>
                <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 16, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${w.rate}%`, background: '#e74b16', height: '100%', borderRadius: '4px 0 0 4px', minWidth: w.rate > 0 ? 2 : 0 }} />
                </div>
                <span style={{ width: 30, textAlign: 'right', fontWeight: 700, color: w.rate >= 30 ? '#1a6d3e' : '#667168' }}>{w.rate}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <Card title="RFQ Cart Status">
          {d.rfqStatus.map((x, i) => <Bar key={i} label={x.s} value={x.c} max={Math.max(...d.rfqStatus.map(y => y.c), 1)} color={x.s === 'submitted' ? '#3498db' : x.s === 'quoted' ? '#27ae60' : x.s === 'closed' ? '#e74c3c' : '#95a5a6'} />)}
        </Card>
        <Card title="Quotation Status">
          {d.quotations.map((x, i) => <Bar key={i} label={x.s} value={x.c} max={Math.max(...d.quotations.map(y => y.c), 1)} color="#1a5bb5" />)}
        </Card>
        <Card title="📍 Top Delivery Locations">
          {d.locations.map((x, i) => <Bar key={i} label={x.loc} value={x.c} max={Math.max(...d.locations.map(y => y.c), 1)} color="#1a6d3e" />)}
        </Card>
      </div>
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
