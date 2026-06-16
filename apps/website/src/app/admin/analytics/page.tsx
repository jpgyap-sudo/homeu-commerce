import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import Link from 'next/link'

interface AnalyticsData {
  leadVolume: { date: string; count: number }[]
  conversionFunnel: { stage: string; count: number; color: string }[]
  topProducts: { title: string; count: number }[]
  salesByBuyerType: { type: string; count: number; total?: number }[]
  rfqPipeline: { status: string; count: number; color: string }[]
  dailyMessages: { date: string; count: number }[]
  summary: {
    totalLeads: number
    totalRFQs: number
    totalQuotations: number
    totalAppointments: number
    totalMessages: number
    conversionRate: string
  }
}

async function loadAnalytics(): Promise<AnalyticsData> {
  try {
    const [
      leadVolumeResult,
      funnelResult,
      topProductsResult,
      buyerTypeResult,
      rfqStatusResult,
      messageVolumeResult,
      statsResult,
    ] = await Promise.all([
      // Lead volume by day (last 14 days)
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM chatbot.leads
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      // Conversion funnel
      query(`
        SELECT 'Leads' as stage, COUNT(*) as count FROM chatbot.leads
        UNION ALL
        SELECT 'RFQ Submitted', COUNT(*) FROM chatbot.rfq_carts WHERE status != 'draft'
        UNION ALL
        SELECT 'Quotations', COUNT(*) FROM rfq_requests
        UNION ALL
        SELECT 'Appointments', COUNT(*) FROM chatbot.appointments
      `),
      // Top products by RFQ count
      query(`
        SELECT product_title as title, COUNT(*) as count
        FROM chatbot.rfq_items
        GROUP BY product_title
        ORDER BY count DESC
        LIMIT 10
      `),
      // Sales by buyer type
      query(`
        SELECT COALESCE(buyer_type, 'Unknown') as type, COUNT(*) as count
        FROM chatbot.leads
        GROUP BY buyer_type
        ORDER BY count DESC
      `),
      // RFQ pipeline status
      query(`
        SELECT status, COUNT(*) as count
        FROM chatbot.rfq_carts
        GROUP BY status
        ORDER BY count DESC
      `),
      // Daily message volume (last 7 days)
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM chatbot.messages
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      // Summary stats
      query(`
        SELECT
          (SELECT COUNT(*) FROM chatbot.leads) as total_leads,
          (SELECT COUNT(*) FROM chatbot.rfq_carts WHERE status != 'draft') as total_rfqs,
          (SELECT COUNT(*) FROM rfq_requests) as total_quotations,
          (SELECT COUNT(*) FROM chatbot.appointments) as total_appointments,
          (SELECT COUNT(*) FROM chatbot.messages) as total_messages
      `),
    ])

    const stats = statsResult.rows[0] || {}
    const totalLeads = Number(stats.total_leads || 0)
    const totalRFQs = Number(stats.total_rfqs || 0)

    return {
      leadVolume: leadVolumeResult.rows.map((r: any) => ({
        date: r.date ? new Date(r.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '',
        count: Number(r.count),
      })),
      conversionFunnel: [
        { stage: 'Leads', count: totalLeads, color: '#3498db' },
        { stage: 'RFQ Submitted', count: totalRFQs, color: '#f39c12' },
        { stage: 'Quotations', count: Number(stats.total_quotations || 0), color: '#27ae60' },
        { stage: 'Appointments', count: Number(stats.total_appointments || 0), color: '#9b59b6' },
      ],
      topProducts: topProductsResult.rows.map((r: any) => ({
        title: r.title || 'Unknown',
        count: Number(r.count),
      })),
      salesByBuyerType: buyerTypeResult.rows.map((r: any) => ({
        type: r.type || 'Unknown',
        count: Number(r.count),
      })),
      rfqPipeline: rfqStatusResult.rows.map((r: any) => ({
        status: r.status || 'unknown',
        count: Number(r.count),
        color: r.status === 'draft' ? '#95a5a6' : r.status === 'submitted' ? '#3498db' : r.status === 'quoted' ? '#27ae60' : r.status === 'closed' ? '#e74c3c' : '#667168',
      })),
      dailyMessages: messageVolumeResult.rows.map((r: any) => ({
        date: r.date ? new Date(r.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '',
        count: Number(r.count),
      })),
      summary: {
        totalLeads,
        totalRFQs,
        totalQuotations: Number(stats.total_quotations || 0),
        totalAppointments: Number(stats.total_appointments || 0),
        totalMessages: Number(stats.total_messages || 0),
        conversionRate: totalLeads > 0 ? ((totalRFQs / totalLeads) * 100).toFixed(1) : '0.0',
      },
    }
  } catch (err) {
    console.error('[analytics] Error loading data:', err)
    return {
      leadVolume: [],
      conversionFunnel: [],
      topProducts: [],
      salesByBuyerType: [],
      rfqPipeline: [],
      dailyMessages: [],
      summary: { totalLeads: 0, totalRFQs: 0, totalQuotations: 0, totalAppointments: 0, totalMessages: 0, conversionRate: '0.0' },
    }
  }
}

function HorizontalBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#151a17' }}>{label}</span>
        <span style={{ color: '#667168', fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 6, height: 20, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 6, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default async function AdminAnalyticsPage() {
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const data = await loadAnalytics()
  const maxProductCount = data.topProducts.length > 0 ? Math.max(...data.topProducts.map(p => p.count)) : 1
  const maxLeadVolume = data.leadVolume.length > 0 ? Math.max(...data.leadVolume.map(d => d.count)) : 1
  const maxMessages = data.dailyMessages.length > 0 ? Math.max(...data.dailyMessages.map(d => d.count)) : 1
  const maxFunnel = data.conversionFunnel.length > 0 ? Math.max(...data.conversionFunnel.map(f => f.count)) : 1

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Analytics</h1>
      <p style={{ color: '#667168', margin: '0 0 32px', fontSize: 14 }}>
        Business performance metrics and conversion insights
      </p>

      {/* Summary Cards */}
      <div className="admin-dashboard-cards" style={{ marginBottom: 32 }}>
        <SummaryCard label="Total Leads" value={data.summary.totalLeads} icon="👤" color="#3498db" />
        <SummaryCard label="RFQ Submissions" value={data.summary.totalRFQs} icon="📋" color="#f39c12" />
        <SummaryCard label="Quotations" value={data.summary.totalQuotations} icon="📄" color="#27ae60" />
        <SummaryCard label="Appointments" value={data.summary.totalAppointments} icon="📅" color="#9b59b6" />
        <SummaryCard label="Messages" value={data.summary.totalMessages} icon="💬" color="#667168" />
        <SummaryCard label="Lead → RFQ Rate" value={data.summary.conversionRate + '%'} icon="📈" color="#e74b16" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Lead Volume Over Time */}
        <Card title="📊 Lead Volume (Last 14 Days)">
          {data.leadVolume.length === 0 ? (
            <EmptyChart msg="No lead data yet" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, paddingTop: 8 }}>
              {data.leadVolume.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%', maxWidth: 40,
                    height: `${(d.count / maxLeadVolume) * 120}px`,
                    minHeight: d.count > 0 ? 4 : 0,
                    background: '#1a6d3e',
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.8,
                  }} />
                  <div style={{ fontSize: 10, color: '#667168', marginTop: 4, transform: 'rotate(-45deg)', whiteSpace: 'nowrap', transformOrigin: 'left' }}>
                    {d.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Conversion Funnel */}
        <Card title="🔄 Conversion Funnel">
          {data.conversionFunnel.every(f => f.count === 0) ? (
            <EmptyChart msg="No conversion data yet" />
          ) : (
            <div style={{ padding: '8px 0' }}>
              {data.conversionFunnel.map((stage, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#151a17' }}>{stage.stage}</span>
                    <span style={{ color: '#667168', fontWeight: 600 }}>{stage.count}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 24, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(stage.count / maxFunnel) * 100}%`,
                      background: stage.color,
                      height: '100%',
                      borderRadius: 6,
                      transition: 'width 0.5s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Products by RFQ Count */}
        <Card title="🏆 Top Products (by RFQ count)">
          {data.topProducts.length === 0 ? (
            <EmptyChart msg="No RFQ item data yet" />
          ) : (
            <div>
              {data.topProducts.map((p, i) => (
                <HorizontalBar key={i} label={p.title} value={p.count} max={maxProductCount} color="#e74b16" />
              ))}
            </div>
          )}
        </Card>

        {/* Sales by Buyer Type */}
        <Card title="👥 Leads by Buyer Type">
          {data.salesByBuyerType.length === 0 ? (
            <EmptyChart msg="No buyer type data yet" />
          ) : (
            <div>
              {data.salesByBuyerType.map((bt, i) => (
                <HorizontalBar key={i} label={bt.type} value={bt.count} max={Math.max(...data.salesByBuyerType.map(b => b.count), 1)} color="#1a6d3e" />
              ))}
            </div>
          )}
        </Card>

        {/* RFQ Pipeline */}
        <Card title="📦 RFQ Pipeline Status">
          {data.rfqPipeline.length === 0 ? (
            <EmptyChart msg="No RFQ pipeline data yet" />
          ) : (
            <div>
              {data.rfqPipeline.map((r, i) => (
                <HorizontalBar key={i} label={r.status} value={r.count} max={Math.max(...data.rfqPipeline.map(s => s.count), 1)} color={r.color} />
              ))}
            </div>
          )}
        </Card>

        {/* Daily Message Volume */}
        <Card title="💬 Daily Messages (Last 7 Days)">
          {data.dailyMessages.length === 0 ? (
            <EmptyChart msg="No message data yet" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, paddingTop: 8 }}>
              {data.dailyMessages.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%', maxWidth: 40,
                    height: `${(d.count / maxMessages) * 120}px`,
                    minHeight: d.count > 0 ? 4 : 0,
                    background: '#9b59b6',
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.8,
                  }} />
                  <div style={{ fontSize: 10, color: '#667168', marginTop: 4, transform: 'rotate(-45deg)', whiteSpace: 'nowrap', transformOrigin: 'left' }}>
                    {d.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #d9e0d7',
      borderRadius: 12,
      padding: 20,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#151a17', margin: '0 0 16px' }}>{title}</h3>
      {children}
    </div>
  )
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="admin-dashboard-card" style={{ borderLeft: `4px solid ${color}` }}>
      <h2 style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
        {icon} {label}
      </h2>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#151a17' }}>{value}</div>
    </div>
  )
}

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 32, color: '#667168', fontSize: 13 }}>
      {msg}
    </div>
  )
}
