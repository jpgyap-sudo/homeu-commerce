'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProductDNACard from '@/components/ProductDNACard'

// ── Types ──────────────────────────────────────────────────────────

interface UnreadCounts {
  website: number
  email: number
  facebook: number
  instagram: number
}

interface DashboardInsights {
  unreadCounts: UnreadCounts
  unrepliedCount: number
  pendingRfqCount: number
  recentActivity: Array<{ action: string; targetType: string; targetId: string; timestamp: string }>
}

interface DNASummary {
  total: number
  avg: number
  grades: { S: number; A: number; B: number; C: number; D: number }
}

interface DNAProduct {
  id: number; title: string; slug: string; score: number; grade: string
  visuals: { score: number; max: number; detail: string }
  descriptive: { score: number; max: number; detail: string }
  commercial: { score: number; max: number; detail: string }
  seo: { score: number; max: number; detail: string }
  performance: { score: number; max: number; detail: string }
  fixes: string[]
}

// ── Component ──────────────────────────────────────────────────────

export default function AdminDashboardClient() {
  const [insights, setInsights] = useState<DashboardInsights | null>(null)
  const [dna, setDna] = useState<{ summary: DNASummary; products: DNAProduct[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [insightsRes, dnaRes] = await Promise.all([
          fetch('/api/admin/dashboard/insights', { credentials: 'include' }),
          fetch('/api/admin/product-dna?bottom=1&limit=5', { credentials: 'include' }),
        ])

        if (insightsRes.ok) {
          const insightsData = await insightsRes.json()
          setInsights(insightsData)
        }

        if (dnaRes.ok) {
          const dnaData = await dnaRes.json()
          setDna(dnaData)
        }
      } catch (err) {
        console.error('[AdminDashboardClient] Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // ── Insight Cards ────────────────────────────────────────────────

  const PROVIDER_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; href: string }> = {
    facebook:  { label: 'Facebook',  icon: '💬', color: '#1877f2', bg: 'var(--luxe-sapphire-bg, #e8f4fd)', href: '/admin/apps/central-inbox?channel=facebook' },
    instagram: { label: 'Instagram', icon: '📸', color: '#e1306c', bg: 'var(--luxe-merlot-bg, #fde8ef)', href: '/admin/apps/central-inbox?channel=instagram' },
    email:     { label: 'Email',     icon: '✉️', color: '#059669', bg: 'var(--luxe-emerald-bg, #ecfdf5)', href: '/admin/apps/email-inbox' },
    website:   { label: 'Website',   icon: '🌐', color: '#2563eb', bg: 'var(--luxe-sapphire-bg, #eff6ff)', href: '/admin/apps/central-inbox?channel=website' },
  }

  if (loading) {
    return (
      <div style={{ marginTop: 'var(--space-8)' }}>
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">📊 Communication & Insights</h2>
          </div>
          <div className="luxe-card-body" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--luxe-slate-400)' }}>
            Loading...
          </div>
        </div>
      </div>
    )
  }

  const totalUnread = insights
    ? Object.values(insights.unreadCounts).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      {/* ── Communication Overview ─────────────────────────────── */}
      <div className="luxe-card">
        <div className="luxe-card-header">
          <h2 className="luxe-card-title">📬 Messages Overview</h2>
          <Link href="/admin/apps/central-inbox" className="luxe-btn luxe-btn-ghost luxe-btn-sm">
            Open Central Inbox
          </Link>
        </div>
        <div className="luxe-card-body" style={{ paddingTop: 0 }}>
          {/* Unread counts per provider */}
          {insights && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
                {Object.entries(PROVIDER_CONFIG).map(([key, cfg]) => {
                  const count = (insights.unreadCounts as any)[key] || 0
                  return (
                    <Link key={key} href={cfg.href} style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: cfg.bg,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{cfg.icon}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-display)' }}>
                          {count}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                          {cfg.label}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Summary row */}
              <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-5)', padding: 'var(--space-4) var(--space-5)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: totalUnread > 0 ? '#e11d48' : '#059669', fontFamily: 'var(--font-display)' }}>
                    {totalUnread}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Unread
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: insights.unrepliedCount > 0 ? '#d97706' : '#059669', fontFamily: 'var(--font-display)' }}>
                    {insights.unrepliedCount}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Unreplied / Forgotten
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--luxe-sapphire)', fontFamily: 'var(--font-display)' }}>
                    {insights.pendingRfqCount}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Pending RFQs
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────────── */}
      {insights && insights.recentActivity.length > 0 && (
        <div className="luxe-card" style={{ marginTop: 'var(--space-6)' }}>
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">🕐 Recent Activity</h2>
          </div>
          <div className="luxe-card-body" style={{ padding: 0 }}>
            <table className="luxe-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {insights.recentActivity.map((act, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{act.action}</td>
                    <td><span className="luxe-badge neutral">{act.targetType}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontFamily: 'var(--font-mono)' }}>
                      {act.timestamp ? new Date(act.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Product DNA Score (live data from API) ─────────────── */}
      {dna && dna.products.length > 0 && (
        <ProductDNACard summary={dna.summary} products={dna.products} />
      )}

      {/* ── Quick Links ────────────────────────────────────────── */}
      <div style={{ marginTop: 'var(--space-6)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Link href="/admin/rfq" style={{ textDecoration: 'none' }}>
          <div className="luxe-card" style={{ cursor: 'pointer' }}>
            <div className="luxe-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 'var(--space-6)' }}>
              <span style={{ fontSize: 36 }}>📋</span>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>
                  Pending RFQs ({insights?.pendingRfqCount || 0})
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--luxe-slate-400)' }}>
                  View and manage quotation requests from customers.
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/admin/apps/central-inbox" style={{ textDecoration: 'none' }}>
          <div className="luxe-card" style={{ cursor: 'pointer' }}>
            <div className="luxe-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 'var(--space-6)' }}>
              <span style={{ fontSize: 36 }}>📬</span>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>
                  Central Inbox ({totalUnread} unread)
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--luxe-slate-400)' }}>
                  All messages from Facebook, Instagram, Email, and website chat.
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
