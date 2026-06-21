export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import LiveVisitors from '@/components/LiveVisitors'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface AnalyticsData {
  error?: string
  // ── Traffic ──
  trafficDaily: { date: string; views: number; visitors: number }[]
  trafficMonthly: { month: string; views: number; visitors: number }[]
  trafficByHour: { hour: number; views: number }[]
  trafficByDayOfWeek: { day: string; views: number }[]
  topReferrers: { source: string; count: number }[]

  // ── Leads ──
  leadVolume: { date: string; count: number }[]
  leadSources: { source: string; count: number }[]
  leadScores: { label: string; count: number; color: string; min: number; max: number }[]

  // ── Sales Pipeline ──
  conversionFunnel: { stage: string; count: number; color: string }[]
  rfqPipeline: { status: string; count: number; color: string }[]
  conversionTrend: { week: string; leads: number; rfqs: number; rate: number }[]

  // ── Products ──
  topProducts: { title: string; count: number }[]
  mostViewedProducts: { title: string; productId: string; views: number }[]

  // ── Engagement ──
  dailyMessages: { date: string; count: number }[]
  appointments: { status: string; count: number }[]

  // ── Geography ──
  topLocations: { location: string; count: number }[]

  // ── Summary ──
  summary: {
    totalLeads: number; totalRFQs: number; totalQuotations: number
    totalAppointments: number; totalMessages: number; totalPageViews: number
    totalUniqueVisitors: number
    todayViews: number; todayLeads: number; todayRFQs: number
    conversionRate: string; avgLeadScore: number
    thisMonthViews: number; lastMonthViews: number
  }
}

// ═══════════════════════════════════════════════════════════════
// Data Loader
// ═══════════════════════════════════════════════════════════════

async function loadAnalytics(): Promise<AnalyticsData> {
  try {
    const [
      // ── Traffic ──
      trafficDailyResult,
      trafficMonthlyResult,
      trafficHourlyResult,
      trafficDayOfWeekResult,
      referrerResult,
      todayStatsResult,
      monthCompareResult,

      // ── Leads ──
      leadVolumeResult,
      leadSourceResult,
      leadScoreResult,
      leadStatsResult,

      // ── Pipeline ──
      conversionTrendResult,
      rfqStatusResult,
      funnelResult,
      appointmentResult,

      // ── Products ──
      topProductsResult,
      productViewsResult,

      // ── Messages ──
      messageVolumeResult,

      // ── Geography ──
      locationResult,
    ] = await Promise.all([
      // Daily traffic (last 14 days)
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT COALESCE(visitor_id, 'anon')) as visitors
        FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at) ORDER BY date ASC
      `),
      // Monthly traffic (last 6 months)
      query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as views, COUNT(DISTINCT COALESCE(visitor_id, 'anon')) as visitors
        FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month ORDER BY month ASC
      `),
      // Hourly traffic distribution
      query(`
        SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as views
        FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY hour ORDER BY hour
      `),
      // Day of week
      query(`
        SELECT TO_CHAR(created_at, 'Day') as day, COUNT(*) as views
        FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY MIN(created_at)
      `),
      // Top referrers
      query(`
        SELECT COALESCE(NULLIF(SPLIT_PART(referrer, '/', 3), ''), 'Direct') as source, COUNT(*) as count
        FROM page_views WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY COALESCE(NULLIF(SPLIT_PART(referrer, '/', 3), ''), 'Direct') ORDER BY count DESC LIMIT 8
      `),
      // Today stats
      query(`
        SELECT
          (SELECT COUNT(*) FROM page_views WHERE is_admin = FALSE AND DATE(created_at) = CURRENT_DATE) as today_views,
          (SELECT COUNT(*) FROM chatbot.leads WHERE DATE(created_at) = CURRENT_DATE) as today_leads,
          (SELECT COUNT(*) FROM chatbot.rfq_carts WHERE status != 'draft' AND DATE(created_at) = CURRENT_DATE) as today_rfqs
      `),
      // Month comparison
      query(`
        SELECT
          (SELECT COUNT(*) FROM page_views WHERE is_admin = FALSE AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as this_month,
          (SELECT COUNT(*) FROM page_views WHERE is_admin = FALSE AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')) as last_month
      `),

      // Lead volume by day (14 days)
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM chatbot.leads WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at) ORDER BY date ASC
      `),
      // Lead sources
      query(`
        SELECT COALESCE(NULLIF(source_page, ''), 'Direct / Unknown') as source, COUNT(*) as count
        FROM chatbot.leads GROUP BY source ORDER BY count DESC LIMIT 8
      `),
      // Lead score distribution
      query(`
        SELECT 'Hot (70+)' as label, 70 as min, 999 as max, '#e74b16' as color, COALESCE(SUM(CASE WHEN score >= 70 THEN 1 ELSE 0 END), 0) as count FROM chatbot.leads
        UNION ALL
        SELECT 'Warm (40-69)', 40, 69, '#d4a017', COALESCE(SUM(CASE WHEN score >= 40 AND score < 70 THEN 1 ELSE 0 END), 0) FROM chatbot.leads
        UNION ALL
        SELECT 'Cool (1-39)', 1, 39, '#3498db', COALESCE(SUM(CASE WHEN score >= 1 AND score < 40 THEN 1 ELSE 0 END), 0) FROM chatbot.leads
        UNION ALL
        SELECT 'Unscored', 0, 0, '#a09c96', COALESCE(SUM(CASE WHEN score = 0 OR score IS NULL THEN 1 ELSE 0 END), 0) FROM chatbot.leads
      `),
      // Lead stats
      query(`SELECT COUNT(*) as total, COALESCE(AVG(score), 0)::numeric(10,1) as avg_score FROM chatbot.leads`),

      // Conversion trend (weekly, last 8 weeks)
      query(`
        SELECT
          TO_CHAR(DATE_TRUNC('week', l.created_at), 'Mon DD') as week,
          COUNT(DISTINCT l.id) as leads,
          COUNT(DISTINCT r.id) as rfqs
        FROM chatbot.leads l
        LEFT JOIN chatbot.rfq_carts r ON r.lead_id = l.id AND r.status != 'draft'
        WHERE l.created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', l.created_at)
        ORDER BY DATE_TRUNC('week', l.created_at) ASC
      `),
      // RFQ status
      query(`SELECT status, COUNT(*) as count FROM chatbot.rfq_carts GROUP BY status ORDER BY count DESC`),
      // Funnel
      query(`
        SELECT 'Leads' as stage, COUNT(*) as count FROM chatbot.leads
        UNION ALL SELECT 'RFQ Submitted', COUNT(*) FROM chatbot.rfq_carts WHERE status != 'draft'
        UNION ALL SELECT 'Quotations', COUNT(*) FROM quotations
        UNION ALL SELECT 'Appointments', COUNT(*) FROM chatbot.appointments
      `),
      // Appointments
      query(`SELECT status, COUNT(*) as count FROM chatbot.appointments GROUP BY status ORDER BY count DESC`),

      // Top products
      query(`SELECT product_title as title, COUNT(*) as count FROM chatbot.rfq_items GROUP BY product_title ORDER BY count DESC LIMIT 10`),
      // Most viewed product pages
      query(`
        SELECT SPLIT_PART(path, '/', 3) as productId, COUNT(*) as views
        FROM page_views WHERE is_admin = FALSE AND path LIKE '/products/%' AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY productId ORDER BY views DESC LIMIT 8
      `),

      // Messages
      query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM chatbot.messages WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date ASC`),

      // Top delivery locations from RFQ carts
      query(`SELECT COALESCE(NULLIF(delivery_location, ''), 'Not specified') as location, COUNT(*) as count FROM chatbot.rfq_carts WHERE delivery_location IS NOT NULL GROUP BY delivery_location ORDER BY count DESC LIMIT 6`),
    ])

    const stats = leadStatsResult.rows[0] || {}
    const todayStats = todayStatsResult.rows[0] || {}
    const monthCompare = monthCompareResult.rows[0] || {}
    const totalLeads = Number(stats.total || 0)
    const totalRFQs = Number((await query(`SELECT COUNT(*) as c FROM chatbot.rfq_carts WHERE status != 'draft'`)).rows[0]?.c || 0)

    return {
      trafficDaily: trafficDailyResult.rows.map((r: any) => ({ date: fmtDate(r.date), views: Number(r.views), visitors: Number(r.visitors) })),
      trafficMonthly: trafficMonthlyResult.rows.map((r: any) => ({ month: r.month, views: Number(r.views), visitors: Number(r.visitors) })),
      trafficByHour: trafficHourlyResult.rows.map((r: any) => ({ hour: Number(r.hour), views: Number(r.views) })),
      trafficByDayOfWeek: trafficDayOfWeekResult.rows.map((r: any) => ({ day: (r.day || '').trim(), views: Number(r.views) })),
      topReferrers: referrerResult.rows.map((r: any) => ({ source: r.source || 'Direct', count: Number(r.count) })),

      leadVolume: leadVolumeResult.rows.map((r: any) => ({ date: fmtDate(r.date), count: Number(r.count) })),
      leadSources: leadSourceResult.rows.map((r: any) => ({ source: r.source, count: Number(r.count) })),
      leadScores: leadScoreResult.rows.map((r: any) => ({ label: r.label, count: Number(r.count), color: r.color, min: Number(r.min), max: Number(r.max) })),

      conversionFunnel: funnelResult.rows.map((r: any) => ({ stage: r.stage, count: Number(r.count), color: r.stage === 'Leads' ? '#3498db' : r.stage === 'RFQ Submitted' ? '#f39c12' : r.stage === 'Quotations' ? '#27ae60' : '#9b59b6' })),
      rfqPipeline: rfqStatusResult.rows.map((r: any) => ({ status: r.status || 'unknown', count: Number(r.count), color: r.status === 'draft' ? '#95a5a6' : r.status === 'submitted' ? '#3498db' : r.status === 'quoted' ? '#27ae60' : r.status === 'closed' ? '#e74c3c' : '#667168' })),
      conversionTrend: conversionTrendResult.rows.map((r: any) => ({ week: r.week, leads: Number(r.leads), rfqs: Number(r.rfqs), rate: Number(r.leads) > 0 ? Math.round((Number(r.rfqs) / Number(r.leads)) * 100) : 0 })),

      topProducts: topProductsResult.rows.map((r: any) => ({ title: r.title || 'Unknown', count: Number(r.count) })),
      mostViewedProducts: productViewsResult.rows.map((r: any) => ({ title: r.productId || '', productId: r.productId || '', views: Number(r.views) })),

      dailyMessages: messageVolumeResult.rows.map((r: any) => ({ date: fmtDate(r.date), count: Number(r.count) })),
      appointments: appointmentResult.rows.map((r: any) => ({ status: r.status || 'unknown', count: Number(r.count) })),

      topLocations: locationResult.rows.map((r: any) => ({ location: r.location, count: Number(r.count) })),

      summary: {
        totalLeads,
        totalRFQs,
        totalQuotations: Number((await query(`SELECT COUNT(*) as c FROM quotations`)).rows[0]?.c || 0),
        totalAppointments: Number((await query(`SELECT COUNT(*) as c FROM chatbot.appointments`)).rows[0]?.c || 0),
        totalMessages: Number((await query(`SELECT COUNT(*) as c FROM chatbot.messages`)).rows[0]?.c || 0),
        totalPageViews: Number((await query(`SELECT COUNT(*) as c FROM page_views WHERE is_admin = FALSE`)).rows[0]?.c || 0),
        totalUniqueVisitors: Number((await query(`SELECT COUNT(DISTINCT visitor_id) as c FROM page_views WHERE is_admin = FALSE AND visitor_id IS NOT NULL`)).rows[0]?.c || 0),
        todayViews: Number(todayStats.today_views || 0),
        todayLeads: Number(todayStats.today_leads || 0),
        todayRFQs: Number(todayStats.today_rfqs || 0),
        conversionRate: totalLeads > 0 ? ((totalRFQs / totalLeads) * 100).toFixed(1) : '0.0',
        avgLeadScore: Number(stats.avg_score || 0),
        thisMonthViews: Number(monthCompare.this_month || 0),
        lastMonthViews: Number(monthCompare.last_month || 0),
      },
    }
  } catch (err) {
    console.error('[analytics] Error:', err)
    return emptyAnalytics(err instanceof Error ? err.message : 'Analytics query failed')
  }
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) } catch { return d }
}

function emptyAnalytics(error?: string): AnalyticsData {
  return {
    error,
    trafficDaily: [], trafficMonthly: [], trafficByHour: [], trafficByDayOfWeek: [], topReferrers: [],
    leadVolume: [], leadSources: [], leadScores: [],
    conversionFunnel: [], rfqPipeline: [], conversionTrend: [],
    topProducts: [], mostViewedProducts: [],
    dailyMessages: [], appointments: [], topLocations: [],
    summary: { totalLeads: 0, totalRFQs: 0, totalQuotations: 0, totalAppointments: 0, totalMessages: 0, totalPageViews: 0, totalUniqueVisitors: 0, todayViews: 0, todayLeads: 0, todayRFQs: 0, conversionRate: '0.0', avgLeadScore: 0, thisMonthViews: 0, lastMonthViews: 0 },
  }
}

const getCachedAnalytics = unstable_cache(loadAnalytics, ['admin-analytics-data'], { revalidate: 120, tags: ['admin-analytics'] })

// ═══════════════════════════════════════════════════════════════
// Chart Helpers
// ═══════════════════════════════════════════════════════════════

function BarChart({ data, max, color, height }: { data: { label: string; value: number }[]; max: number; color: string; height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: height || 140, paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 9, color: '#667168', marginBottom: 3, fontWeight: 600 }}>{d.value || ''}</div>
          <div style={{ width: '100%', maxWidth: 36, height: `${max > 0 ? (d.value / max) * 100 : 0}%`, minHeight: d.value > 0 ? 4 : 0, background: color, borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
          <div style={{ fontSize: 9, color: '#667168', marginTop: 5, transform: 'rotate(-35deg)', whiteSpace: 'nowrap', transformOrigin: 'left', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

function HorizontalBar({ value, max, color, label, suffix }: { value: number; max: number; color: string; label: string; suffix?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#151a17', fontSize: 12 }}>{label}</span>
        <span style={{ color: '#667168', fontWeight: 600, fontSize: 12 }}>{value}{suffix || ''}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 6, height: 18, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 6, transition: 'width 0.5s', minWidth: pct > 0 ? 4 : 0 }} />
      </div>
    </div>
  )
}

function HeatmapCell({ value, max, label }: { value: number; max: number; label: string }) {
  const intensity = max > 0 ? value / max : 0
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: 6, background: `rgba(26, 109, 62, ${0.08 + intensity * 0.85})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: intensity > 0.5 ? '#fff' : '#151a17' }}>
        {value || ''}
      </div>
      <div style={{ fontSize: 9, color: '#667168', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 14px', background: '#f7f9f6', borderRadius: 8, border: '1px solid #eef1ed' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#151a17' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#667168', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#a09c96', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function TrendBadge({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) {
  if (lastMonth === 0) return null
  const change = Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  const up = change >= 0
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: up ? '#1a6d3e' : '#e74b16', marginLeft: 6 }}>
      {up ? '↑' : '↓'} {Math.abs(change)}% vs last month
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════

export default async function AdminAnalyticsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const d = await getCachedAnalytics()
  const s = d.summary

  const maxTraffic = Math.max(...d.trafficDaily.map(x => x.views), 1)
  const maxLeadVol = Math.max(...d.leadVolume.map(x => x.count), 1)
  const maxMsg = Math.max(...d.dailyMessages.map(x => x.count), 1)
  const maxFunnel = Math.max(...d.conversionFunnel.map(x => x.count), 1)
  const maxProduct = Math.max(...d.topProducts.map(x => x.count), 1)
  const maxBuyer = Math.max(...d.leadSources.map(x => x.count), 1)
  const maxScore = Math.max(...d.leadScores.map(x => x.count), 1)

  return (
    <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {d.error && <div role="alert" style={{ marginBottom: 16, padding: 12, border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#991b1b' }}>Analytics could not be loaded: {d.error}</div>}
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#151a17' }}>Analytics Dashboard</h1>
          <p style={{ color: '#667168', margin: 0, fontSize: 14 }}>
            Site traffic, leads, sales pipeline, and engagement metrics
            <TrendBadge thisMonth={s.thisMonthViews} lastMonth={s.lastMonthViews} />
          </p>
        </div>
        <span style={{ fontSize: 12, color: '#a09c96', paddingTop: 4 }}>
          Updated {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Live visitor counter */}
      <div style={{ marginBottom: 24 }}>
        <LiveVisitors variant="card" />
      </div>

      {/* ── TODAY SNAPSHOT ─────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Today</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          <MiniStat label="Page Views" value={s.todayViews} />
          <MiniStat label="New Leads" value={s.todayLeads} />
          <MiniStat label="RFQs Today" value={s.todayRFQs} />
          <MiniStat label="All-Time Views" value={s.totalPageViews.toLocaleString()} sub={`${s.totalUniqueVisitors.toLocaleString()} unique`} />
          <MiniStat label="Avg Lead Score" value={s.avgLeadScore} sub="out of 100" />
          <MiniStat label="Conv. Rate" value={s.conversionRate + '%'} sub="Lead → RFQ" />
        </div>
      </section>

      {/* ── SITE TRAFFIC ────────────────────────────────────── */}
      <Section title="📊 Site Traffic">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <Card title="Daily Page Views (Last 14 Days)">
            {d.trafficDaily.length === 0 ? <Empty /> : (
              <BarChart
                data={d.trafficDaily.map(x => ({ label: x.date, value: x.views }))}
                max={maxTraffic} color="#1a6d3e" height={160}
              />
            )}
          </Card>
          <Card title="Monthly Traffic (Last 6 Months)">
            {d.trafficMonthly.length === 0 ? <Empty /> : (
              <BarChart
                data={d.trafficMonthly.map(x => ({ label: x.month, value: x.views }))}
                max={Math.max(...d.trafficMonthly.map(x => x.views), 1)} color="#1a5bb5" height={160}
              />
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* Hourly Heatmap */}
          <Card title="⏰ Traffic by Hour">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
              {Array.from({ length: 24 }, (_, h) => {
                const found = d.trafficByHour.find(x => x.hour === h)
                return <HeatmapCell key={h} value={found?.views || 0} max={Math.max(...d.trafficByHour.map(x => x.views), 1)} label={`${h}h`} />
              })}
            </div>
          </Card>

          {/* Day of Week */}
          <Card title="📅 Traffic by Day">
            <div style={{ display: 'grid', gap: 6 }}>
              {d.trafficByDayOfWeek.map(x => (
                <HorizontalBar key={x.day} label={x.day} value={x.views} max={Math.max(...d.trafficByDayOfWeek.map(y => y.views), 1)} color="#9b59b6" />
              ))}
            </div>
          </Card>

          {/* Top Referrers */}
          <Card title="🔗 Top Referrers (30d)">
            {d.topReferrers.length === 0 ? <Empty msg="No referrer data" /> : (
              <div>
                {d.topReferrers.map((r, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: '#151a17', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source}</span>
                      <span style={{ color: '#667168', fontWeight: 600 }}>{r.count}</span>
                    </div>
                    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${(r.count / Math.max(...d.topReferrers.map(x => x.count), 1)) * 100}%`, background: '#1a5bb5', height: '100%', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* ── LEADS & CONVERSION ──────────────────────────────── */}
      <Section title="👤 Leads & Conversion">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <Card title="Lead Volume (14 Days)">
            {d.leadVolume.length === 0 ? <Empty /> : (
              <BarChart data={d.leadVolume.map(x => ({ label: x.date, value: x.count }))} max={maxLeadVol} color="#e74b16" height={140} />
            )}
          </Card>
          <Card title="Lead Score Distribution">
            {d.leadScores.length === 0 ? <Empty /> : (
              <div>
                {d.leadScores.map((ls, i) => (
                  <HorizontalBar key={i} label={ls.label} value={ls.count} max={maxScore} color={ls.color} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card title="Lead Sources">
            {d.leadSources.length === 0 ? <Empty /> : (
              <div>
                {d.leadSources.map((ls, i) => (
                  <HorizontalBar key={i} label={ls.source} value={ls.count} max={maxBuyer} color="#3498db" />
                ))}
              </div>
            )}
          </Card>
          <Card title="Conversion Trend (Weekly)">
            {d.conversionTrend.length === 0 ? <Empty /> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {d.conversionTrend.map((ct, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ width: 60, color: '#667168', fontSize: 11 }}>{ct.week}</span>
                    <span style={{ color: '#3498db', fontWeight: 600, width: 30 }}>{ct.leads}L</span>
                    <span style={{ color: '#e74b16', fontWeight: 600, width: 30 }}>{ct.rfqs}R</span>
                    <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 14, overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${ct.rate}%`, background: '#e74b16', height: '100%', borderRadius: '4px 0 0 4px', minWidth: ct.rate > 0 ? 2 : 0, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ width: 30, textAlign: 'right', fontWeight: 700, color: ct.rate >= 30 ? '#1a6d3e' : '#667168' }}>{ct.rate}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* ── SALES PIPELINE ──────────────────────────────────── */}
      <Section title="💰 Sales Pipeline">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          <Card title="Conversion Funnel">
            {d.conversionFunnel.every(f => f.count === 0) ? <Empty /> : (
              <div>
                {d.conversionFunnel.map((f, i) => (
                  <HorizontalBar key={i} label={f.stage} value={f.count} max={maxFunnel} color={f.color} />
                ))}
              </div>
            )}
          </Card>
          <Card title="RFQ Pipeline Status">
            {d.rfqPipeline.length === 0 ? <Empty /> : (
              <div>
                {d.rfqPipeline.map((r, i) => (
                  <HorizontalBar key={i} label={r.status} value={r.count} max={Math.max(...d.rfqPipeline.map(x => x.count), 1)} color={r.color} />
                ))}
              </div>
            )}
          </Card>
          <Card title="📍 Top Delivery Locations">
            {d.topLocations.length === 0 ? <Empty msg="No location data yet" /> : (
              <div>
                {d.topLocations.map((loc, i) => (
                  <HorizontalBar key={i} label={loc.location} value={loc.count} max={Math.max(...d.topLocations.map(x => x.count), 1)} color="#2d8f5e" />
                ))}
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* ── PRODUCTS & ENGAGEMENT ───────────────────────────── */}
      <Section title="🛋️ Products & Engagement">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card title="Top Products by RFQ">
            {d.topProducts.length === 0 ? <Empty /> : (
              <div>
                {d.topProducts.map((p, i) => (
                  <HorizontalBar key={i} label={p.title} value={p.count} max={maxProduct} color="#e74b16" />
                ))}
              </div>
            )}
          </Card>
          <Card title="Daily Messages (7 Days)">
            {d.dailyMessages.length === 0 ? <Empty /> : (
              <BarChart data={d.dailyMessages.map(x => ({ label: x.date, value: x.count }))} max={maxMsg} color="#9b59b6" height={140} />
            )}
          </Card>
        </div>
      </Section>

      {/* ── MOST VIEWED PAGES ───────────────────────────────── */}
      <Section title="👁️ Most Viewed Pages (30 Days)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card title="All Pages">
            {d.trafficDaily.length === 0 ? <Empty msg="No page view data yet. Add PageViewTracker to your layout." /> : (
              <div>
                {/* We'll use topReferrers + trafficDaily as page-level proxy. Build from page_views top pages */}
                <Empty msg="Page-level breakdown requires page_views data. Ensure the migration has been run." />
              </div>
            )}
          </Card>
          <Card title="Product Pages">
            {d.mostViewedProducts.length === 0 ? <Empty msg="No product page views" /> : (
              <div>
                {d.mostViewedProducts.map((p, i) => (
                  <HorizontalBar key={i} label={p.title || p.productId} value={p.views} max={Math.max(...d.mostViewedProducts.map(x => x.views), 1)} color="#1a5bb5" />
                ))}
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* ── APPOINTMENTS ────────────────────────────────────── */}
      <Section title="📅 Appointments">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card title="Appointment Status">
            {d.appointments.length === 0 ? <Empty /> : (
              <div>
                {d.appointments.map((a, i) => (
                  <HorizontalBar key={i} label={a.status} value={a.count} max={Math.max(...d.appointments.map(x => x.count), 1)} color="#9b59b6" />
                ))}
              </div>
            )}
          </Card>
          <Card title="Total Counts">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MiniStat label="Total Leads" value={s.totalLeads.toLocaleString()} />
              <MiniStat label="Total RFQs" value={s.totalRFQs.toLocaleString()} />
              <MiniStat label="Quotations" value={s.totalQuotations.toLocaleString()} />
              <MiniStat label="Appointments" value={s.totalAppointments.toLocaleString()} />
              <MiniStat label="Messages" value={s.totalMessages.toLocaleString()} />
              <MiniStat label="Page Views" value={s.totalPageViews.toLocaleString()} />
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #d9e0d7' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#151a17', margin: '0 0 14px' }}>{title}</h3>
      {children}
    </div>
  )
}

function Empty({ msg }: { msg?: string }) {
  return <div style={{ textAlign: 'center', padding: 32, color: '#667168', fontSize: 13 }}>{msg || 'No data yet'}</div>
}
