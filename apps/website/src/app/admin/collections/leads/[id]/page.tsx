'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface LeadDetail {
  id: string
  name: string
  email: string
  mobile: string
  buyer_type: string | null
  company_name: string | null
  project_location: string | null
  source_page: string | null
  referrer: string | null
  status: string
  score: number
  score_label: string | null
  total_visits: number
  last_seen_at: string | null
  style_dna: Record<string, any> | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
  conversation_summary: string | null
}

interface SiblingLead {
  id: string
  name: string
  mobile: string
  status: string
  score: number
  score_label: string | null
  total_visits: number
  page_view_count: number
  conversation_count: number
  message_count: number
  source_page: string | null
  created_at: string
  last_seen_at: string | null
}

interface Appointment {
  id: string
  preferred_date: string
  preferred_time: string
  visitor_count: number
  categories_of_interest: string[]
  status: string
  notes: string
  created_at: string
}

interface PageView {
  id: string
  path: string
  title: string | null
  time_on_page_sec: number
  created_at: string
}

interface TopPage {
  path: string
  view_count: number
  last_viewed_at: string
  avg_time_sec: number
}

interface TopCategory {
  category: string
  view_count: number
  last_viewed_at: string
}

interface SessionInfo {
  session_id: string
  session_start: string
  session_end: string
  page_count: number
  total_time_sec: number
}

interface VisitorProfile {
  style_dna: Record<string, any>
  product_affinity: Record<string, any>
  total_visits: number
  conversation_count: number
  last_conversation_summary: string
}

interface AnalyticsData {
  pageViews: PageView[]
  topPages: TopPage[]
  topCategories: TopCategory[]
  sessions: SessionInfo[]
  visitorProfile: VisitorProfile | null
  searches: any[]
}

interface Conversation {
  id: string
  status: string
  message_count: number
  last_message_at: string
  created_at: string
}

interface Message {
  id: string
  sender_type: string
  content: string | null
  created_at: string
}

// ── Status config ──────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  new: '🆕 New', contacted: '📞 Contacted', qualified: '✅ Qualified',
  quoted: '📄 Quoted', won: '🏆 Won', lost: '❌ Lost', spam: '🚫 Spam',
}
const STATUS_COLORS: Record<string, string> = {
  new: '#3498db', contacted: '#f39c12', qualified: '#27ae60',
  quoted: '#9b59b6', won: '#2ecc71', lost: '#e74c3c', spam: '#95a5a6',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function timeSince(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

function scoreColor(score: number, label: string | null): string {
  if (label === 'hot' || score >= 70) return '#e74b16'
  if (label === 'warm' || score >= 40) return '#d4a017'
  return '#667168'
}

function scoreLabel(score: number, label: string | null): string {
  const badges: Record<string, string> = { hot: '🔥 Hot', warm: '🟡 Warm', cold: '🔵 Cold', qualified: '✅ Qualified' }
  if (label && badges[label]) return badges[label]
  if (score >= 70) return '🔥 Hot'
  if (score >= 40) return '🟡 Warm'
  return '🔵 Cold'
}

function formatSecs(sec: number): string {
  if (!sec || sec <= 0) return '—'
  if (sec < 60) return `${Math.round(sec)}s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

// ── Style helpers ──────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#151a17' }}>{value}</div>
    </div>
  )
}

function Card({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h2>
        {badge && <span style={{ fontSize: 12, color: '#667168' }}>{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#151a17' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#667168', marginTop: 2 }}>{label}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function LeadDetailPage() {
  const params = useParams()
  const leadId = params.id as string

  // State
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [siblings, setSiblings] = useState<SiblingLead[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [selectedConvMsgs, setSelectedConvMsgs] = useState<Message[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'sessions' | 'messages' | 'appointments'>('overview')

  useEffect(() => {
    if (!leadId) return
    loadAll()
  }, [leadId])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      // 1. Lead detail
      const leadRes = await fetch(`/api/leads/${leadId}`)
      if (!leadRes.ok) throw new Error('Failed to load lead')
      const leadData: LeadDetail = await leadRes.json()
      setLead(leadData)

      // 2. Sibling leads (same email)
      if (leadData.email?.trim()) {
        const siblingRes = await fetch(`/api/leads/by-email/${encodeURIComponent(leadData.email.trim())}`)
        if (siblingRes.ok) {
          const siblingData = await siblingRes.json()
          setSiblings((siblingData.leads || []).filter((s: SiblingLead) => s.id !== leadId))
        }
      }

      // 3. Appointments
      const apptRes = await fetch(`/api/appointments?leadId=${encodeURIComponent(leadId)}&limit=20`)
      if (apptRes.ok) {
        const apptData = await apptRes.json()
        setAppointments((apptData.docs || []).filter((a: any) => a.lead_id === leadId))
      }

      // 4. Analytics (page views, top pages, sessions, profile)
      const analyticsRes = await fetch(`/api/leads/${leadId}/analytics`)
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData)
      }

      // 5. Conversation history
      const convRes = await fetch(`/api/leads/${leadId}/conversations`)
      if (convRes.ok) {
        const convData = await convRes.json()
        setConversations(convData.conversations || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lead')
    } finally {
      setLoading(false)
    }
  }

  async function loadConversationMessages(conversationId: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}/conversations/${conversationId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setSelectedConvId(conversationId)
        setSelectedConvMsgs(data.messages || [])
      }
    } catch { /* ignore */ }
  }

  async function updateStatus(status: string) {
    if (!lead) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update lead')
      setLead(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ height: 24, width: 200, background: '#e5e7eb', borderRadius: 4, marginBottom: 24 }} />
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 32 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 20, background: '#e5e7eb', borderRadius: 4, marginBottom: 16, width: `${60 + i * 8}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3 style={{ margin: '0 0 8px', color: '#151a17' }}>Lead not found</h3>
          <p style={{ color: '#667168', marginBottom: 16 }}>{error || 'The requested lead does not exist.'}</p>
          <Link href="/admin/collections/leads" style={{ color: '#1a6d3e' }}>&larr; Back to Leads</Link>
        </div>
      </div>
    )
  }

  // ── Derived data ─────────────────────────────────────────────
  const allLeadCount = siblings.length + 1
  const totalPageViews = analytics?.pageViews?.length || 0
  const totalSessions = analytics?.sessions?.length || 0
  const topCategories = analytics?.topCategories?.slice(0, 5) || []
  const topPages = analytics?.topPages?.slice(0, 5) || []
  const styleDNA = analytics?.visitorProfile?.style_dna || lead.style_dna || null
  const productAffinity = analytics?.visitorProfile?.product_affinity || null

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/dashboard" style={{ color: '#667168', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ color: '#667168', margin: '0 8px' }}>/</span>
        <Link href="/admin/collections/leads" style={{ color: '#667168', textDecoration: 'none' }}>Leads</Link>
        <span style={{ color: '#667168', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 500 }}>{lead.name}</span>
      </div>

      {error && <div role="alert" style={{ padding: 12, marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b' }}>{error}</div>}

      {/* ── HEADER: Name + Quick Stats ─────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{lead.name}</h1>
          <p style={{ margin: 0, color: '#667168', fontSize: 14 }}>
            {lead.email} · {lead.mobile}
            {lead.last_seen_at && <> · Last seen: {timeSince(lead.last_seen_at)}</>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#667168' }}>Visit #{lead.total_visits || 1}</span>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 12,
            fontSize: 13, fontWeight: 500, color: '#fff',
            background: scoreColor(lead.score, lead.score_label),
          }}>
            {scoreLabel(lead.score, lead.score_label)} — {lead.score}/100
          </span>
        </div>
      </div>

      {/* ── ALL LEADS FROM THIS CLIENT ─────────────────────────── */}
      {siblings.length > 0 && (
        <Card title={`All Leads from ${lead.name} (${allLeadCount} total)`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f4f6f4' }}>
                  <th style={thStyle}>Lead ID</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Visits</th>
                  <th style={thStyle}>Page Views</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Last Seen</th>
                  <th style={{ ...thStyle, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {/* Current lead (highlighted) */}
                <tr style={{ borderTop: '2px solid #1a6d3e', background: '#f0faf4' }}>
                  <td style={{ padding: 10, fontWeight: 600 }}>#{String(lead.id).slice(-8).toUpperCase()}</td>
                  <td style={{ padding: 10 }}>{lead.mobile}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, color: '#fff', background: STATUS_COLORS[lead.status] || '#667168' }}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>{lead.score}</td>
                  <td style={{ padding: 10 }}>{lead.total_visits || 1}</td>
                  <td style={{ padding: 10 }}>—</td>
                  <td style={{ padding: 10, fontSize: 11 }}>{lead.source_page || '—'}</td>
                  <td style={{ padding: 10, fontSize: 11 }}>{shortDate(lead.created_at)}</td>
                  <td style={{ padding: 10, fontSize: 11 }}>{lead.last_seen_at ? timeSince(lead.last_seen_at) : '—'}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ fontSize: 10, color: '#1a6d3e', fontWeight: 600 }}>CURRENT</span>
                  </td>
                </tr>
                {/* Sibling leads */}
                {siblings.map((s) => (
                  <tr key={s.id} style={{ borderTop: '1px solid #d9e0d7' }}>
                    <td style={{ padding: 10 }}>
                      <Link href={`/admin/collections/leads/${s.id}`} style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}>
                        #{String(s.id).slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td style={{ padding: 10, color: '#667168' }}>{s.mobile}</td>
                    <td style={{ padding: 10 }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, color: '#fff', background: STATUS_COLORS[s.status] || '#667168' }}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                    <td style={{ padding: 10 }}>{s.score}</td>
                    <td style={{ padding: 10 }}>{s.total_visits || 1}</td>
                    <td style={{ padding: 10 }}>{s.page_view_count || 0}</td>
                    <td style={{ padding: 10, fontSize: 11 }}>{s.source_page || '—'}</td>
                    <td style={{ padding: 10, fontSize: 11 }}>{shortDate(s.created_at)}</td>
                    <td style={{ padding: 10, fontSize: 11 }}>{s.last_seen_at ? timeSince(s.last_seen_at) : '—'}</td>
                    <td style={{ padding: 10 }}>
                      <Link href={`/admin/collections/leads/${s.id}`} style={{ color: '#1a6d3e', fontSize: 12 }}>View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Top Stats Row ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 16 }}>
          <MiniStat value={String(lead.total_visits || 1)} label="Total Visits" />
        </div>
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 16 }}>
          <MiniStat value={String(totalPageViews)} label="Page Views" />
        </div>
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 16 }}>
          <MiniStat value={String(totalSessions)} label="Sessions" />
        </div>
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 16 }}>
          <MiniStat value={String(allLeadCount)} label={allLeadCount > 1 ? 'Total Leads' : 'Lead Entries'} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 16 }}>
          <MiniStat value={String(conversations.length)} label="Conversations" />
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #d9e0d7', paddingBottom: 0 }}>
        {[
          { key: 'overview' as const, label: '📋 Overview' },
          { key: 'pages' as const, label: `🖥️ Pages (${totalPageViews})` },
          { key: 'sessions' as const, label: `🔄 Sessions (${totalSessions})` },
          { key: 'messages' as const, label: `💬 Messages (${conversations.length})` },
          { key: 'appointments' as const, label: `📅 Appointments (${appointments.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', border: 'none', background: activeTab === tab.key ? '#1a6d3e' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#667168', borderRadius: '8px 8px 0 0',
              fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: OVERVIEW                                           */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Lead Info */}
          <Card title="Lead Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="Email" value={lead.email} />
              <Field label="Mobile" value={lead.mobile} />
              <Field label="Buyer Type" value={lead.buyer_type || '—'} />
              <Field label="Company" value={lead.company_name || '—'} />
              <Field label="Project Location" value={lead.project_location || '—'} />
              <Field label="Source Page" value={lead.source_page || '—'} />
              <Field label="Referrer" value={lead.referrer || '—'} />
              <Field label="Created" value={formatDate(lead.created_at)} />
              <Field label="Updated" value={formatDate(lead.updated_at)} />
              <Field label="Last Seen" value={lead.last_seen_at ? timeSince(lead.last_seen_at) : '—'} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Status</div>
                <select
                  value={lead.status}
                  disabled={saving}
                  onChange={(event) => updateStatus(event.target.value)}
                  style={{ padding: '7px 10px', border: `1px solid ${STATUS_COLORS[lead.status] || '#667168'}`, borderRadius: 8, background: '#fff' }}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {saving && <span style={{ marginLeft: 8, color: '#667168', fontSize: 12 }}>Saving…</span>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Score</div>
                <span style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 12,
                  fontSize: 13, fontWeight: 500, color: '#fff',
                  background: scoreColor(lead.score, lead.score_label),
                }}>
                  {scoreLabel(lead.score, lead.score_label)} — {lead.score}/100
                </span>
              </div>
            </div>
            {lead.conversation_summary && (
              <div style={{ marginTop: 16, padding: 12, background: '#f4f6f4', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', marginBottom: 4 }}>Conversation Summary</div>
                <p style={{ margin: 0, fontSize: 13, color: '#333' }}>{lead.conversation_summary}</p>
              </div>
            )}
          </Card>

          {/* Top Categories / Products */}
          {topCategories.length > 0 && (
            <Card title="🛍️ Top Categories Viewed" badge={`${topCategories.length} categories`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {topCategories.map((cat, i) => (
                  <div key={i} style={{
                    padding: 12, background: '#f4f6f4', borderRadius: 8,
                    borderLeft: `3px solid ${i === 0 ? '#1a6d3e' : i < 3 ? '#d4a017' : '#d9e0d7'}`,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#151a17', marginBottom: 4 }}>
                      {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}
                      {cat.category}
                    </div>
                    <div style={{ fontSize: 12, color: '#667168' }}>
                      {cat.view_count} view{cat.view_count !== 1 ? 's' : ''} · Last {timeSince(cat.last_viewed_at)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Top Pages */}
          {topPages.length > 0 && (
            <Card title="📄 Top Pages" badge={`${topPages.length} pages`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topPages.map((page, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: '#f4f6f4', borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#667168', fontWeight: 600, minWidth: 24 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{page.path}</div>
                        <div style={{ fontSize: 11, color: '#667168' }}>
                          {page.view_count} visit{page.view_count !== 1 ? 's' : ''}
                          {page.avg_time_sec > 0 ? ` · avg ${formatSecs(page.avg_time_sec)}` : ''}
                        </div>
                      </div>
                    </div>
                    <Link href={page.path} target="_blank" style={{ fontSize: 12, color: '#1a6d3e', textDecoration: 'none' }}>View →</Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Style DNA */}
          {styleDNA && Object.keys(styleDNA).length > 0 && (
            <Card title="🎨 Style DNA">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {(styleDNA as any).styles?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#667168', marginBottom: 4 }}>Styles</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(styleDNA as any).styles.map((s: string, i: number) => (
                        <span key={i} style={{ padding: '2px 8px', background: '#e8f2ec', color: '#1a6d3e', borderRadius: 12, fontSize: 12 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(styleDNA as any).materials?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#667168', marginBottom: 4 }}>Materials</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(styleDNA as any).materials.map((m: string, i: number) => (
                        <span key={i} style={{ padding: '2px 8px', background: '#f4f0e8', color: '#8a6d1f', borderRadius: 12, fontSize: 12 }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(styleDNA as any).colors?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#667168', marginBottom: 4 }}>Colors</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(styleDNA as any).colors.map((c: string, i: number) => (
                        <span key={i} style={{ padding: '2px 8px', background: '#e8ecf2', color: '#1a3d6e', borderRadius: 12, fontSize: 12 }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(styleDNA as any).roomTypes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#667168', marginBottom: 4 }}>Room Types</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(styleDNA as any).roomTypes.map((r: string, i: number) => (
                        <span key={i} style={{ padding: '2px 8px', background: '#f0e8f4', color: '#6d1a8a', borderRadius: 12, fontSize: 12 }}>{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Product Affinity */}
          {productAffinity?.category_counts && Object.keys(productAffinity.category_counts).length > 0 && (
            <Card title="📊 Product Affinity">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(productAffinity.category_counts as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([category, count], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13 }}>{category}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a6d3e' }}>{count}x</span>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Metadata */}
          {lead.metadata && Object.keys(lead.metadata).length > 0 && (
            <Card title="Metadata">
              <pre style={{
                background: '#f4f6f4', padding: 16, borderRadius: 8, fontSize: 12,
                overflow: 'auto', maxHeight: 300, margin: 0,
              }}>
                {JSON.stringify(lead.metadata, null, 2)}
              </pre>
            </Card>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: PAGES                                              */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'pages' && (
        <>
          {/* Page view timeline */}
          <Card title="Page View Timeline" badge={`${totalPageViews} views`}>
            {analytics?.pageViews && analytics.pageViews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analytics.pageViews.map((pv) => (
                  <div key={pv.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: '#f4f6f4', borderRadius: 8, fontSize: 13,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ color: '#667168', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {shortDate(pv.created_at)}
                      </span>
                      <Link href={pv.path} target="_blank" style={{ color: '#1a6d3e', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pv.title || pv.path}
                      </Link>
                    </div>
                    <span style={{ color: '#667168', fontSize: 11, whiteSpace: 'nowrap', marginLeft: 12 }}>
                      {pv.time_on_page_sec > 0 ? formatSecs(pv.time_on_page_sec) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>No page views recorded yet. Page tracking starts when the lead submits the chat form and browses the site.</p>
            )}
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: SESSIONS                                           */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <Card title="Session History" badge={`${totalSessions} sessions`}>
          {analytics?.sessions && analytics.sessions.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f4f6f4' }}>
                  <th style={thStyle}>Start</th>
                  <th style={thStyle}>End</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>Pages</th>
                </tr>
              </thead>
              <tbody>
                {analytics.sessions.map((s, i) => (
                  <tr key={s.session_id || i} style={{ borderTop: '1px solid #d9e0d7' }}>
                    <td style={{ padding: 10, fontSize: 12 }}>{shortDate(s.session_start)}</td>
                    <td style={{ padding: 10, fontSize: 12 }}>{s.session_end ? shortDate(s.session_end) : '—'}</td>
                    <td style={{ padding: 10, fontSize: 12 }}>{s.total_time_sec > 0 ? formatSecs(s.total_time_sec) : '—'}</td>
                    <td style={{ padding: 10, fontSize: 12 }}>{s.page_count} page{s.page_count !== 1 ? 's' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>No session data yet.</p>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: MESSAGES                                           */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'messages' && (
        <Card title="Conversation History" badge={`${conversations.length} conversations`}>
          {conversations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {conversations.map((conv) => (
                <div key={conv.id} style={{
                  border: '1px solid #d9e0d7', borderRadius: 10, overflow: 'hidden',
                }}>
                  <div
                    onClick={() => {
                      if (selectedConvId === conv.id) {
                        setSelectedConvId(null)
                        setSelectedConvMsgs(null)
                      } else {
                        loadConversationMessages(conv.id)
                      }
                    }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', background: '#f4f6f4', cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <strong>{conv.status}</strong>
                      <span style={{ color: '#667168', marginLeft: 8 }}>
                        {conv.message_count || 0} messages · {conv.created_at ? formatDate(conv.created_at) : ''}
                      </span>
                    </div>
                    <span style={{ color: '#667168', fontSize: 11 }}>
                      {selectedConvId === conv.id ? '▲' : '▼'}
                    </span>
                  </div>
                  {selectedConvId === conv.id && selectedConvMsgs && (
                    <div style={{ maxHeight: 400, overflowY: 'auto', padding: 12 }}>
                      {selectedConvMsgs.map((msg, i) => (
                        <div key={msg.id || i} style={{
                          marginBottom: 8, padding: '8px 12px', borderRadius: 8,
                          background: msg.sender_type === 'visitor' ? '#f0faf4' : msg.sender_type === 'admin' ? '#f4f0fa' : '#f4f6f4',
                          fontSize: 13,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 600, fontSize: 11, color: '#667168' }}>
                              {msg.sender_type === 'visitor' ? '👤 Visitor' : msg.sender_type === 'admin' ? '🛠️ Admin' : msg.sender_type === 'bot' ? '🤖 Bot' : '⚙️ System'}
                            </span>
                            <span style={{ fontSize: 10, color: '#667168' }}>{msg.created_at ? shortDate(msg.created_at) : ''}</span>
                          </div>
                          <p style={{ margin: 0, color: '#333' }}>{msg.content || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>No conversations yet.</p>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: APPOINTMENTS                                       */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'appointments' && (
        <Card title="Appointments" badge={`${appointments.length} total`}>
          {appointments.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f4f6f4' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Visitors</th>
                  <th style={thStyle}>Categories</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} style={{ borderTop: '1px solid #d9e0d7' }}>
                    <td style={{ padding: 10, fontSize: 13 }}>{a.preferred_date || '—'}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>{a.preferred_time || '—'}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>{a.visitor_count || '—'}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>{(a.categories_of_interest || []).join(', ') || '—'}</td>
                    <td style={{ padding: 10 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                        fontSize: 11, fontWeight: 500, color: '#fff',
                        background: a.status === 'confirmed' ? '#27ae60' : a.status === 'completed' ? '#2ecc71' : a.status === 'cancelled' ? '#e74c3c' : '#3498db',
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: 10, fontSize: 12, color: '#667168', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>No appointments for this lead.</p>
          )}
        </Card>
      )}

      {/* ── Back link ──────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <Link href="/admin/collections/leads" style={{ color: '#1a6d3e', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back to All Leads
        </Link>
      </div>
    </div>
  )
}
