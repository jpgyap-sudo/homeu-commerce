'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProductDNACard from '@/components/ProductDNACard'

// ── Types ──────────────────────────────────────────────────────────

interface UnreadCounts { website: number; email: number; facebook: number; instagram: number }

interface DashboardInsights {
  unreadCounts: UnreadCounts
  unrepliedCount: number
  pendingRfqCount: number
  conversionFunnel: { visitors: number; leads: number; rfqs: number; quotations: number; closed: number }
  rfqAging: { buckets: { fresh: number; attention: number; warning: number; critical: number }; values: { fresh: number; attention: number; warning: number; critical: number } }
  avgResponseHours: number | null
  hotProducts: { title: string; rfqCount: number }[]
  coldProductCount: number
  pulseScore: number
  abandonedRfqCount: number
}

interface DNASummary { total: number; avg: number; grades: { S: number; A: number; B: number; C: number; D: number } }
interface DNAProduct { id: number; title: string; slug: string; score: number; grade: string; visuals: any; descriptive: any; commercial: any; seo: any; performance: any; fixes: string[] }

function fmtMoney(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function PulseGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#e11d48'
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical'
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--luxe-warm-200)" strokeWidth="6" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${(score / 100) * 213.6} 213.6`}
            strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{label}</div>
    </div>
  )
}

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
        if (insightsRes.ok) setInsights(await insightsRes.json())
        if (dnaRes.ok) setDna(await dnaRes.json())
      } catch (err) { console.error('[AdminDashboardClient] Failed:', err) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const PROVIDER_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; href: string }> = {
    facebook:  { label: 'Facebook',  icon: '💬', color: '#1877f2', bg: '#e8f4fd', href: '/admin/apps/central-inbox?channel=facebook' },
    instagram: { label: 'Instagram', icon: '📸', color: '#e1306c', bg: '#fde8ef', href: '/admin/apps/central-inbox?channel=instagram' },
    email:     { label: 'Email',     icon: '✉️', color: '#059669', bg: '#ecfdf5', href: '/admin/apps/email-inbox' },
    website:   { label: 'Website',   icon: '🌐', color: '#2563eb', bg: '#eff6ff', href: '/admin/apps/central-inbox?channel=website' },
  }

  if (loading) return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      <div className="luxe-card"><div className="luxe-card-body" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--luxe-slate-400)' }}>Loading dashboard...</div></div>
    </div>
  )

  const totalUnread = insights ? Object.values(insights.unreadCounts).reduce((a, b) => a + b, 0) : 0
  const f = insights?.conversionFunnel
  const funnelSteps = f ? [
    { label: 'Visitors', count: f.visitors, pct: 100 },
    { label: 'Leads', count: f.leads, pct: f.visitors > 0 ? Math.round(f.leads / f.visitors * 100) : 0 },
    { label: 'RFQs', count: f.rfqs, pct: f.leads > 0 ? Math.round(f.rfqs / f.leads * 100) : 0 },
    { label: 'Quoted', count: f.quotations, pct: f.rfqs > 0 ? Math.round(f.quotations / f.rfqs * 100) : 0 },
    { label: 'Closed', count: f.closed, pct: f.quotations > 0 ? Math.round(f.closed / f.quotations * 100) : 0 },
  ] : []

  return (
    <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ── P0: Weekly Pulse Score ──────────────────────────────────────── */}
      {insights && (
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">📊 Weekly Pulse Score</h2>
            <span style={{ fontSize: 12, color: 'var(--luxe-slate-400)' }}>Combines leads, RFQs, quotes − stale penalties</span>
          </div>
          <div className="luxe-card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', padding: 'var(--space-4) var(--space-6)' }}>
            <PulseGauge score={insights.pulseScore} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', fontFamily: 'var(--font-display)' }}>{insights.conversionFunnel.leads}</div>
                <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leads (7d)</div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#d97706', fontFamily: 'var(--font-display)' }}>{insights.pendingRfqCount}</div>
                <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending RFQs</div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: insights.avgResponseHours !== null && insights.avgResponseHours <= 2 ? '#059669' : '#e11d48', fontFamily: 'var(--font-display)' }}>
                  {insights.avgResponseHours !== null ? insights.avgResponseHours + 'h' : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Response Time</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── P0: Conversion Funnel ─────────────────────────────────────── */}
      {funnelSteps.length > 0 && (
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">📈 Conversion Funnel</h2>
            <Link href="/admin/analytics" className="luxe-btn luxe-btn-ghost luxe-btn-sm">Full Analytics</Link>
          </div>
          <div className="luxe-card-body" style={{ padding: 'var(--space-4) var(--space-6)' }}>
            {funnelSteps.map((step, i) => {
              const keepPct = i > 0 ? funnelSteps[i - 1].count > 0 ? Math.round(step.count / funnelSteps[i - 1].count * 100) : 0 : 100
              const isLeak = keepPct < 70 && i > 0
              return (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-2) 0', borderBottom: i < funnelSteps.length - 1 ? '1px solid var(--luxe-warm-100)' : 'none' }}>
                  <div style={{ width: 80, fontSize: 12, fontWeight: 600, color: 'var(--luxe-navy-900)' }}>{step.label}</div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ height: 24, background: 'var(--luxe-warm-100)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(step.pct, 5)}%`, height: '100%', background: isLeak ? '#e11d48' : '#059669', borderRadius: 6, transition: 'width 1s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 60 }}>
                        <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{step.count.toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: isLeak ? '#e11d48' : '#059669', fontWeight: 600, marginTop: 2 }}>
                      {i > 0 ? `${keepPct}% retention from ${funnelSteps[i - 1].label}` : '100% (baseline)'}
                      {isLeak && <span style={{ marginLeft: 4 }}>⚠️ Leak!</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── P0: RFQ Aging ─────────────────────────────────────────────── */}
      {insights && (
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">⏰ RFQ Aging</h2>
            <Link href="/admin/rfq" className="luxe-btn luxe-btn-ghost luxe-btn-sm">Manage RFQs</Link>
          </div>
          <div className="luxe-card-body" style={{ padding: 'var(--space-4) var(--space-6)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
              {[
                { key: 'fresh', label: '🟢 0-24h', color: '#059669' },
                { key: 'attention', label: '🟡 1-3d', color: '#d97706' },
                { key: 'warning', label: '🟠 3-7d', color: '#ea580c' },
                { key: 'critical', label: '🔴 7d+', color: '#e11d48' },
              ].map((bucket) => {
                const count = (insights.rfqAging.buckets as any)[bucket.key] || 0
                const value = (insights.rfqAging.values as any)[bucket.key] || 0
                return (
                  <div key={bucket.key} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: bucket.color, fontFamily: 'var(--font-display)' }}>{count}</div>
                    <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{bucket.label}</div>
                    {value > 0 && <div style={{ fontSize: 11, color: bucket.color, fontWeight: 600, marginTop: 2 }}>{fmtMoney(value)}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages Overview ─────────────────────────────────────────── */}
      <div className="luxe-card">
        <div className="luxe-card-header">
          <h2 className="luxe-card-title">📬 Messages Overview</h2>
          <Link href="/admin/apps/central-inbox" className="luxe-btn luxe-btn-ghost luxe-btn-sm">Open Inbox</Link>
        </div>
        <div className="luxe-card-body" style={{ paddingTop: 0 }}>
          {insights && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)', paddingTop: 'var(--space-4)' }}>
                {Object.entries(PROVIDER_CONFIG).map(([key, cfg]) => {
                  const count = (insights.unreadCounts as any)[key] || 0
                  return (
                    <Link key={key} href={cfg.href} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: cfg.bg, textAlign: 'center', cursor: 'pointer' }}>
                        <div style={{ fontSize: 20, marginBottom: 2 }}>{cfg.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-display)' }}>{count}</div>
                        <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cfg.label}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: totalUnread > 0 ? '#e11d48' : '#059669', fontFamily: 'var(--font-display)' }}>{totalUnread}</div>
                  <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase' }}>Total Unread</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: insights.unrepliedCount > 0 ? '#d97706' : '#059669', fontFamily: 'var(--font-display)' }}>{insights.unrepliedCount}</div>
                  <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase' }}>Unreplied</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--luxe-sapphire)', fontFamily: 'var(--font-display)' }}>{insights.abandonedRfqCount}</div>
                  <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, textTransform: 'uppercase' }}>Abandoned Carts</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Hot Products ────────────────────────────────────────────────── */}
      {insights && insights.hotProducts.length > 0 && (
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">🔥 Most Inquired Products</h2>
            <Link href="/admin/products" className="luxe-btn luxe-btn-ghost luxe-btn-sm">All Products</Link>
          </div>
          <div className="luxe-card-body" style={{ padding: 0 }}>
            <table className="luxe-table">
              <thead><tr><th>Product</th><th style={{ textAlign: 'right' }}>RFQs</th></tr></thead>
              <tbody>
                {insights.hotProducts.slice(0, 5).map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{p.title}</td>
                    <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#d97706', fontFamily: 'var(--font-mono)' }}>{p.rfqCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {insights.coldProductCount > 0 && (
              <div style={{ padding: 'var(--space-3) var(--space-6)', fontSize: 12, color: 'var(--luxe-slate-400)', borderTop: '1px solid var(--luxe-warm-100)' }}>
                ⚠️ {insights.coldProductCount} products have zero RFQ inquiries
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Response Time ─────────────────────────────────────────────── */}
      {insights && insights.avgResponseHours !== null && (
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">⏱️ Response Time</h2>
          </div>
          <div className="luxe-card-body" style={{ padding: 'var(--space-4) var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-display)', color: insights.avgResponseHours <= 2 ? '#059669' : insights.avgResponseHours <= 6 ? '#d97706' : '#e11d48' }}>
                {insights.avgResponseHours}h
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--luxe-slate-400)', fontWeight: 600 }}>Average time to first admin reply</div>
                <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', marginTop: 2 }}>
                  {insights.avgResponseHours <= 2 ? '✅ Excellent — faster than industry average' :
                   insights.avgResponseHours <= 6 ? '⚠️ Room for improvement — target under 2 hours' :
                   '❌ Too slow — customers may go elsewhere'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Product DNA Score ─────────────────────────────────────────── */}
      {dna && dna.products.length > 0 && <ProductDNACard summary={dna.summary} products={dna.products} />}

      {/* ── Quick Links ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Link href="/admin/rfq" style={{ textDecoration: 'none' }}>
          <div className="luxe-card" style={{ cursor: 'pointer' }}>
            <div className="luxe-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 'var(--space-6)' }}>
              <span style={{ fontSize: 36 }}>📋</span>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>Pending RFQs ({insights?.pendingRfqCount || 0})</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--luxe-slate-400)' }}>View and manage quotation requests.</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/admin/apps/central-inbox" style={{ textDecoration: 'none' }}>
          <div className="luxe-card" style={{ cursor: 'pointer' }}>
            <div className="luxe-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 'var(--space-6)' }}>
              <span style={{ fontSize: 36 }}>📬</span>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>Central Inbox ({totalUnread})</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--luxe-slate-400)' }}>All messages across channels.</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
