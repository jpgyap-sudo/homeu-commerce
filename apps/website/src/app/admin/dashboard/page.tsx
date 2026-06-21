import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'

// ── Types ────────────────────────────────────────────────────────────
interface DashboardCounts {
  products: number; customers: number; categories: number
  rfqRequests: number; redirects: number
  leads: number; conversations: number; messages: number; appointments: number
  recentLeads: Array<{ id: string; name: string; email: string; mobile: string
    buyer_type: string | null; status: string; score: number; score_label: string | null
    source_page: string | null; created_at: string }>
  scoringSummary: { hot: number; warm: number; cold: number; qualified: number
    avg_score: number; total_leads: number; high_value_leads: number }
}

// ── Optimized Data Fetching (2 queries instead of 11) ─────────────────
async function loadDashboardData(): Promise<DashboardCounts> {
  try {
    // Consolidated counts: 1 query for public schema tables
    const countsResult = await query(`
      SELECT
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COUNT(*) FROM categories) AS categories,
        (SELECT COUNT(*) FROM rfq_requests) AS rfq_requests,
        (SELECT COUNT(*) FROM redirects) AS redirects
    `)
    const counts = countsResult.rows[0] || {}

    // Chatbot stats: 1 query for all leads data
    const leadsResult = await query(`
      SELECT
        COUNT(*) AS total_leads,
        COUNT(*) FILTER (WHERE score >= 81) AS qualified,
        COUNT(*) FILTER (WHERE score >= 51 AND score < 81) AS hot,
        COUNT(*) FILTER (WHERE score >= 21 AND score < 51) AS warm,
        COUNT(*) FILTER (WHERE score < 21) AS cold,
        COALESCE(AVG(score), 0)::numeric(10,2) AS avg_score,
        COUNT(*) FILTER (WHERE score >= 51) AS high_value_leads,
        (SELECT COUNT(*) FROM chatbot.conversations) AS conversations,
        (SELECT COUNT(*) FROM chatbot.messages) AS messages,
        (SELECT COUNT(*) FROM chatbot.appointments) AS appointments
      FROM chatbot.leads
    `)
    const leadStats = leadsResult.rows[0] || {}

    // Recent leads
    const recentResult = await query(`
      SELECT id, name, email, mobile, buyer_type, status, score, score_label, source_page, created_at
      FROM chatbot.leads ORDER BY created_at DESC LIMIT 5
    `)

    return {
      products: Number(counts.products||0), customers: Number(counts.customers||0),
      categories: Number(counts.categories||0), rfqRequests: Number(counts.rfq_requests||0),
      redirects: Number(counts.redirects||0),
      leads: Number(leadStats.total_leads||0), conversations: Number(leadStats.conversations||0),
      messages: Number(leadStats.messages||0), appointments: Number(leadStats.appointments||0),
      recentLeads: recentResult.rows.map((r: any) => ({
        id: r.id, name: r.name, email: r.email, mobile: r.mobile,
        buyer_type: r.buyer_type, status: r.status,
        score: r.score, score_label: r.score_label,
        source_page: r.source_page, created_at: r.created_at,
      })),
      scoringSummary: {
        hot: Number(leadStats.hot||0), warm: Number(leadStats.warm||0),
        cold: Number(leadStats.cold||0), qualified: Number(leadStats.qualified||0),
        avg_score: Number(leadStats.avg_score||0),
        total_leads: Number(leadStats.total_leads||0),
        high_value_leads: Number(leadStats.high_value_leads||0),
      },
    }
  } catch {
    return {
      products:0,customers:0,categories:0,rfqRequests:0,redirects:0,
      leads:0,conversations:0,messages:0,appointments:0,
      recentLeads:[],scoringSummary:{hot:0,warm:0,cold:0,qualified:0,avg_score:0,total_leads:0,high_value_leads:0},
    }
  }
}

const getCached = unstable_cache(loadDashboardData, ['admin-dashboard-data'], { revalidate: 120, tags: ['admin-dashboard'] })

// ── Helpers ──────────────────────────────────────────────────────────
function fmt(n: number): string { return n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n) }
function fmtDate(iso: string): string { try { return new Date(iso).toLocaleDateString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) } catch { return iso } }
function scoreClass(score: number): string { if (score>=81) return 'success'; if (score>=51) return 'warning'; if (score>=21) return 'info'; return 'neutral' }
function initials(name: string): string { return (name||'?').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) }

// ── Page ─────────────────────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const d = await getCached()
  const s = d.scoringSummary

  return (
    <>
      {/* Header */}
      <header className="luxe-page-header">
        <h1 className="luxe-page-title">Dashboard</h1>
        <p className="luxe-page-subtitle">Welcome back, {session.name}. Here&apos;s what&apos;s happening today.</p>
      </header>

      {/* Stat Cards */}
      <div className="luxe-stats-grid">
        <StatCard icon="◆" iconClass="gold" value={fmt(d.products)} label="Products" change={d.products > 0 ? '+'+d.products : '0'} href="/admin/products" />
        <StatCard icon="◇" iconClass="navy" value={fmt(d.categories)} label="Categories" change={d.categories+' total'} href="/admin/categories" />
        <StatCard icon="◎" iconClass="emerald" value={fmt(d.rfqRequests)} label="RFQ Requests" change={d.rfqRequests > 0 ? 'Active' : 'None'} href="/admin/rfq" up />
        <StatCard icon="◑" iconClass="merlot" value={fmt(d.leads)} label="Leads" change={s.total_leads > 0 ? s.high_value_leads+' hot' : 'None'} href="/admin/collections/leads" />
      </div>

      {/* Two-column grid */}
      <div className="luxe-grid-2">
        {/* Lead Pipeline */}
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">Lead Pipeline</h2>
            <Link href="/admin/analytics/pipeline" className="luxe-btn luxe-btn-ghost luxe-btn-sm">View All</Link>
          </div>
          <div className="luxe-card-body" style={{ paddingTop: 0 }}>
            {s.total_leads > 0 ? (
              <div style={{ display: 'flex', gap: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
                {[
                  { label: 'Qualified', count: s.qualified, pct: s.total_leads ? Math.round(s.qualified/s.total_leads*100) : 0, color: '#059669', bg: 'var(--luxe-emerald-bg)' },
                  { label: 'Hot', count: s.hot, pct: s.total_leads ? Math.round(s.hot/s.total_leads*100) : 0, color: '#d97706', bg: 'var(--luxe-amber-bg)' },
                  { label: 'Warm', count: s.warm, pct: s.total_leads ? Math.round(s.warm/s.total_leads*100) : 0, color: '#2563eb', bg: 'var(--luxe-sapphire-bg)' },
                  { label: 'Cold', count: s.cold, pct: s.total_leads ? Math.round(s.cold/s.total_leads*100) : 0, color: '#94a3b8', bg: 'var(--luxe-warm-100)' },
                ].map(seg => (
                  <div key={seg.label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: seg.color, lineHeight: 1.2 }}>{seg.count}</div>
                    <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{seg.label}</div>
                    <div style={{ marginTop: 8, height: 4, borderRadius: 999, background: 'var(--luxe-warm-200)' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: seg.color, width: seg.pct+'%', transition: 'width 1s var(--ease-out)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="luxe-empty"><div className="luxe-empty-icon">◇</div><p className="luxe-empty-title">No leads yet</p><p className="luxe-empty-desc">Leads from the concierge chatbot will appear here.</p></div>}
            {s.total_leads > 0 && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--luxe-slate-600)' }}>Average score: </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>{s.avg_score}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--luxe-slate-400)', marginLeft: 4 }}>/ 100</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">Recent Leads</h2>
            <Link href="/admin/collections/leads" className="luxe-btn luxe-btn-ghost luxe-btn-sm">View All</Link>
          </div>
          <div className="luxe-card-body" style={{ padding: 0 }}>
            {d.recentLeads.length > 0 ? (
              <table className="luxe-table">
                <thead><tr><th>Lead</th><th>Type</th><th>Score</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {d.recentLeads.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--luxe-gold-400), var(--luxe-gold-300))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--luxe-navy-900)', flexShrink: 0 }}>{initials(lead.name)}</div>
                          <div>
                            <div className="text-cell" style={{ fontWeight: 600 }}>{lead.name || 'Anonymous'}</div>
                            <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)' }}>{lead.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`luxe-badge ${lead.buyer_type === 'business' ? 'info' : lead.buyer_type === 'individual' ? 'neutral' : 'neutral'}`}>{lead.buyer_type || '—'}</span></td>
                      <td><span className={`luxe-badge ${scoreClass(lead.score)}`}>{lead.score}</span></td>
                      <td><span className="luxe-badge info">{lead.status}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontFamily: 'var(--font-mono)' }}>{fmtDate(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="luxe-empty"><div className="luxe-empty-icon">◑</div><p className="luxe-empty-title">No leads yet</p></div>}
          </div>
        </div>
      </div>

      {/* Theme quick links */}
      <div style={{ marginTop: 'var(--space-8)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Link href="/admin/theme" style={{ textDecoration: 'none' }}>
          <div className="luxe-card" style={{ cursor: 'pointer' }}>
            <div className="luxe-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 'var(--space-6)' }}>
              <span style={{ fontSize: 36 }}>🧩</span>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>Theme Sections</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--luxe-slate-400)' }}>
                  Add, reorder, and edit homepage sections — including footer areas.
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/admin/navigation" style={{ textDecoration: 'none' }}>
          <div className="luxe-card" style={{ cursor: 'pointer' }}>
            <div className="luxe-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 'var(--space-6)' }}>
              <span style={{ fontSize: 36 }}>🔗</span>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>Navigation</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--luxe-slate-400)' }}>
                  Edit header &amp; footer menu links directly.
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Client-side rendered dashboard widgets */}
      <AdminDashboardClient />
    </>
  )
}


// ── Reusable Components ──────────────────────────────────────────────

function StatCard({ icon, iconClass, value, label, change, href, up }: {
  icon: string; iconClass: string; value: string; label: string; change: string; href: string; up?: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="luxe-stat-card">
        <div className={`luxe-stat-icon ${iconClass}`}>{icon}</div>
        <div className="luxe-stat-value">{value}</div>
        <div className="luxe-stat-label">{label}</div>
        <div className={`luxe-stat-change ${up ? 'up' : 'neutral'}`}>{change}</div>
      </div>
    </Link>
  )
}
