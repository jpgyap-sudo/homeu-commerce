import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import Link from 'next/link'

interface DashboardCounts {
  products: number
  customers: number
  categories: number
  rfqRequests: number
  leads: number
  conversations: number
  messages: number
  appointments: number
  recentLeads: Array<{
    id: string
    name: string
    email: string
    mobile: string
    buyer_type: string | null
    status: string
    score: number
    score_label: string | null
    source_page: string | null
    created_at: string
  }>
}

async function loadDashboardData(): Promise<DashboardCounts> {
  try {
    const [
      productCount,
      customerCount,
      categoryCount,
      rfqCount,
      leadCount,
      conversationCount,
      messageCount,
      appointmentCount,
      recentLeadsResult,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM products').then(r => Number(r.rows[0]?.count || 0)),
      query('SELECT COUNT(*) as count FROM customers').then(r => Number(r.rows[0]?.count || 0)),
      query('SELECT COUNT(*) as count FROM categories').then(r => Number(r.rows[0]?.count || 0)),
      query('SELECT COUNT(*) as count FROM rfq_requests').then(r => Number(r.rows[0]?.count || 0)),
      query('SELECT COUNT(*) as count FROM chatbot.leads').then(r => Number(r.rows[0]?.count || 0)),
      query('SELECT COUNT(*) as count FROM chatbot.conversations').then(r => Number(r.rows[0]?.count || 0)),
      query('SELECT COUNT(*) as count FROM chatbot.messages').then(r => Number(r.rows[0]?.count || 0)),
      query('SELECT COUNT(*) as count FROM chatbot.appointments').then(r => Number(r.rows[0]?.count || 0)),
      query(
        `SELECT id, name, email, mobile, buyer_type, status, score, score_label, source_page, created_at
         FROM chatbot.leads
         ORDER BY created_at DESC
         LIMIT 5`
      ),
    ])

    return {
      products: productCount,
      customers: customerCount,
      categories: categoryCount,
      rfqRequests: rfqCount,
      leads: leadCount,
      conversations: conversationCount,
      messages: messageCount,
      appointments: appointmentCount,
      recentLeads: recentLeadsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        mobile: row.mobile,
        buyer_type: row.buyer_type,
        status: row.status,
        score: row.score,
        score_label: row.score_label,
        source_page: row.source_page,
        created_at: row.created_at,
      })),
    }
  } catch {
    return {
      products: 0, customers: 0, categories: 0, rfqRequests: 0,
      leads: 0, conversations: 0, messages: 0, appointments: 0,
      recentLeads: [],
    }
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: '🆕 New',
    contacted: '📞 Contacted',
    qualified: '✅ Qualified',
    quoted: '📄 Quoted',
    won: '🏆 Won',
    lost: '❌ Lost',
    spam: '🚫 Spam',
  }
  return labels[status] || status
}

function scoreBadge(score: number, label: string | null): string {
  const badges: Record<string, string> = {
    hot: '🔥 Hot',
    warm: '🟡 Warm',
    cold: '🔵 Cold',
    qualified: '✅ Qualified',
  }
  if (label && badges[label]) return badges[label]
  if (score >= 70) return '🔥 Hot'
  if (score >= 40) return '🟡 Warm'
  return '🔵 Cold'
}

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const data = await loadDashboardData()

  return (
    <div className="admin-dashboard">
      <h1>Welcome, {session.name || session.email}</h1>
      <p>HomeU Operations Console — <strong>{session.role}</strong> — {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      {/* ── Core Metrics ─────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Catalog & Sales</h2>
        <div className="admin-dashboard-cards">
          <div className="admin-dashboard-card">
            <h2>Products</h2>
            <a href="/admin/products" className="count-link">{data.products}</a>
          </div>
          <div className="admin-dashboard-card">
            <h2>Customers</h2>
            <a href="/admin/customers" className="count-link">{data.customers}</a>
          </div>
          <div className="admin-dashboard-card">
            <h2>Categories</h2>
            <a href="/admin/categories" className="count-link">{data.categories}</a>
          </div>
          <div className="admin-dashboard-card">
            <h2>RFQ Requests</h2>
            <a href="/admin/rfq" className="count-link">{data.rfqRequests}</a>
          </div>
        </div>
      </section>

      {/* ── Chatbot Metrics ──────────────────────────────────── */}
      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Chatbot & Engagement</h2>
        <div className="admin-dashboard-cards">
          <div className="admin-dashboard-card">
            <h2>Leads</h2>
            <div className="count">{data.leads}</div>
          </div>
          <div className="admin-dashboard-card">
            <h2>Conversations</h2>
            <div className="count">{data.conversations}</div>
          </div>
          <div className="admin-dashboard-card">
            <h2>Messages</h2>
            <div className="count">{data.messages}</div>
          </div>
          <div className="admin-dashboard-card">
            <h2>Appointments</h2>
            <div className="count">{data.appointments}</div>
          </div>
        </div>
      </section>

      {/* ── Recent Leads ─────────────────────────────────────── */}
      {data.recentLeads.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div style={{
            background: '#fff',
            border: '1px solid #d9e0d7',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #d9e0d7',
            }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#151a17' }}>
                📋 Recent Leads
              </h2>
              <span style={{ fontSize: 12, color: '#667168' }}>
                Last 5 — <Link href="/admin/collections/leads" style={{ color: '#1a6d3e', textDecoration: 'none' }}>View all</Link>
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Source</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLeads.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <a href={`/admin/collections/leads/${lead.id}`} style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}>
                          {lead.name}
                        </a>
                      </td>
                      <td style={{ fontSize: 13, color: '#667168' }}>
                        <div>{lead.email}</div>
                        <div>{lead.mobile}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{lead.buyer_type || '—'}</td>
                      <td>
                        <span className={`status-badge status-${lead.status}`}>
                          {statusLabel(lead.status)}
                        </span>
                      </td>
                      <td>
                        <span className={`score-badge score-${lead.score_label || (lead.score >= 70 ? 'hot' : lead.score >= 40 ? 'warm' : 'cold')}`}>
                          {scoreBadge(lead.score, lead.score_label)} {lead.score}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#667168' }}>{lead.source_page || '—'}</td>
                      <td style={{ fontSize: 12, color: '#667168' }}>{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Quick Actions ────────────────────────────────────── */}
      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quick Actions</h2>
        <div className="admin-quick-actions">
          <a href="/admin/products" className="admin-quick-action-card">
            <span className="admin-quick-action-icon">🛋️</span>
            <span className="admin-quick-action-label">Products</span>
            <span className="admin-quick-action-arrow">→</span>
          </a>
          <a href="/admin/rfq" className="admin-quick-action-card">
            <span className="admin-quick-action-icon">📋</span>
            <span className="admin-quick-action-label">Manage RFQs</span>
            <span className="admin-quick-action-arrow">→</span>
          </a>
          <a href="/admin/quotations" className="admin-quick-action-card">
            <span className="admin-quick-action-icon">📄</span>
            <span className="admin-quick-action-label">Quotations</span>
            <span className="admin-quick-action-arrow">→</span>
          </a>
          <a href="/admin/collections/leads" className="admin-quick-action-card">
            <span className="admin-quick-action-icon">👤</span>
            <span className="admin-quick-action-label">Leads</span>
            <span className="admin-quick-action-arrow">→</span>
          </a>
          <a href="/admin/collections/appointments" className="admin-quick-action-card">
            <span className="admin-quick-action-icon">📅</span>
            <span className="admin-quick-action-label">Appointments</span>
            <span className="admin-quick-action-arrow">→</span>
          </a>
          <a href="/admin/customers" className="admin-quick-action-card">
            <span className="admin-quick-action-icon">🏢</span>
            <span className="admin-quick-action-label">Customers</span>
            <span className="admin-quick-action-arrow">→</span>
          </a>
        </div>
      </section>

      {/* ── Session Info ─────────────────────────────────────── */}
      <div style={{
        marginTop: 32,
        padding: '16px 20px',
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #d9e0d7',
        fontSize: 13,
        color: '#667168',
      }}>
        Logged in as <strong>{session.email}</strong> ({session.role})
      </div>
    </div>
  )
}
