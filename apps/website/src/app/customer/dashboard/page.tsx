'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/format-utils'
import { getQuoteCart } from '@/components/QuoteCart'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  createdAt: string
}

interface RfqItem {
  productTitleSnapshot?: string
  quantity: number
}

interface Rfq {
  id: string
  status: string
  estimatedTotal: number | null
  createdAt: string
  items?: RfqItem[]
  conversationId?: string | null
  messageCount?: number | null
  lastMessageAt?: string | null
  lastMessageSender?: 'customer' | 'admin' | 'system' | 'ai_bot' | null
  lastMessagePreview?: string | null
}

interface Quotation {
  id: string
  quotationNumber?: string
  rfqId?: string | null
  status: string
  pendingRevision: boolean
  revisionRequest?: string
  total: number
  createdAt: string
}

// rfq_requests.status is a Postgres enum with exactly these 5 values
// (new, contacted, quoted, closed, lost) — verified against the live enum,
// since the customer-facing pages had drifted to reference values
// ('quotation_sent', 'closed_won', 'closed_lost') that never existed in the
// DB and could never actually match a real row.
const RFQ_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:       { label: 'Received',  color: '#e8a020' },
  contacted: { label: 'In Review', color: '#3b82f6' },
  quoted:    { label: 'Quoted',    color: '#8b5cf6' },
  closed:    { label: 'Completed', color: '#059669' },
  lost:      { label: 'Cancelled', color: '#6b7280' },
}

const JOURNEY_STEPS = ['Submitted', 'In Discussion', 'Quoted', 'Confirmed']

const SEEN_KEY_PREFIX = 'homeu_rfq_seen_'

function getLastSeen(rfqId: string): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(SEEN_KEY_PREFIX + rfqId)
  return raw ? parseInt(raw, 10) || 0 : 0
}

/** Derives a 4-step journey position from RFQ status + its quotations — no
 * schema change needed, just reads what's already there. Closed/lost RFQs
 * are shown with a terminal badge instead of the stepper. */
function journeyStep(rfq: Rfq, quotations: Quotation[]): number {
  const ownQuotations = quotations.filter(q => q.rfqId === rfq.id)
  if (ownQuotations.some(q => q.status === 'accepted')) return 3
  if (ownQuotations.length > 0 || rfq.status === 'quoted') return 2
  if (rfq.status === 'contacted') return 1
  return 0
}

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [stats, setStats] = useState({ activeProjects: 0, awaitingDecision: 0, totalInvestment: 0 })
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/customer/dashboard-summary', { credentials: 'include' })
      .then(async res => {
        if (res.status === 401) { router.push('/login'); return null }
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Failed to load your dashboard')
        }
        return res.json()
      })
      .then(data => {
        if (!data) return
        setCustomer(data.customer)
        setRfqs(data.rfqs || [])
        setQuotations(data.quotations || [])
        setStats(data.stats || { activeProjects: 0, awaitingDecision: 0, totalInvestment: 0 })
      })
      .catch(err => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))

    setCartCount(getQuoteCart().reduce((sum, item) => sum + item.quantity, 0))
  }, [router])

  async function handleLogout() {
    await fetch('/api/customers/logout', { method: 'POST', credentials: 'include' })
    router.push('/')
    router.refresh()
  }

  const quotationsNeedingAttention = useMemo(
    () => quotations.filter(q => q.status === 'sent' && !q.pendingRevision),
    [quotations]
  )

  if (loading) {
    return <main className="dashboard-shell"><p className="dashboard-loading">Loading your dashboard...</p></main>
  }

  if (!customer) {
    return (
      <main className="dashboard-shell" style={{ textAlign: 'center' }}>
        <h1>We couldn&apos;t load your account</h1>
        <p className="dashboard-loading">{error || 'Please reload to try again.'}</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>Reload</button>
      </main>
    )
  }

  const memberSince = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
    : null

  return (
    <main className="dashboard-shell">
      {/* Hero */}
      <div className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">My HomeU</p>
          <h1>Welcome back, {customer.name.split(' ')[0]}</h1>
          {memberSince && <p className="dashboard-hero-sub">Member since {memberSince}</p>}
        </div>
        <div className="dashboard-hero-actions">
          <Link href="/products" className="btn btn--secondary">Browse Products</Link>
          <button onClick={handleLogout} className="dashboard-logout-btn">Log Out</button>
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-value">{stats.activeProjects}</span>
          <span className="dashboard-stat-label">Active Projects</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-value">{stats.awaitingDecision}</span>
          <span className="dashboard-stat-label">Awaiting Your Decision</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-value">{formatPrice(stats.totalInvestment)}</span>
          <span className="dashboard-stat-label">Your HomeU Investment</span>
        </div>
      </div>

      {/* Continue where you left off */}
      {cartCount > 0 && (
        <Link href="/quote-cart" className="dashboard-cart-nudge">
          <span>🛋️ You have {cartCount} item{cartCount !== 1 ? 's' : ''} waiting in your RFQ cart</span>
          <span className="dashboard-cart-nudge-cta">Continue →</span>
        </Link>
      )}

      {/* Needs Your Attention */}
      {quotationsNeedingAttention.length > 0 && (
        <section className="dashboard-attention">
          <h2>Needs Your Attention</h2>
          <div className="dashboard-attention-list">
            {quotationsNeedingAttention.map(q => (
              <Link key={q.id} href={`/customer/quotation/${q.id}`} className="dashboard-attention-card">
                <div>
                  <strong>Quotation {q.quotationNumber || `#${String(q.id).slice(-6).toUpperCase()}`}</strong>
                  <p>Ready for your review — accept or request changes</p>
                </div>
                <div className="dashboard-attention-total">
                  {formatPrice(q.total)}
                  <span className="dashboard-attention-arrow">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      <section className="dashboard-projects">
        <div className="dashboard-section-heading">
          <h2>Your Projects</h2>
          <Link href="/products" className="btn btn--primary">+ New RFQ</Link>
        </div>

        {rfqs.length === 0 ? (
          <div className="dashboard-empty">
            <p>You haven&apos;t started a project yet.</p>
            <p className="dashboard-empty-sub">Browse our catalog and request a quotation to get started.</p>
            <Link href="/products" className="btn btn--primary">Browse Products</Link>
          </div>
        ) : (
          <div className="dashboard-project-grid">
            {rfqs.map(rfq => {
              const isClosed = rfq.status === 'closed' || rfq.status === 'lost'
              const statusInfo = RFQ_STATUS_LABELS[rfq.status] || { label: rfq.status, color: '#999' }
              const step = journeyStep(rfq, quotations)
              const hasNewMessage = Boolean(
                rfq.lastMessageAt && new Date(rfq.lastMessageAt).getTime() > getLastSeen(rfq.id)
              )
              const relatedQuotation = quotations.find(q => q.rfqId === rfq.id)

              return (
                <article key={rfq.id} className="dashboard-project-card">
                  <div className="dashboard-project-card-header">
                    <span className="dashboard-project-id">RFQ #{String(rfq.id).slice(-6).toUpperCase()}</span>
                    <span className="dashboard-project-badge" style={{ background: statusInfo.color + '20', color: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className="dashboard-project-meta">
                    {new Date(rfq.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {' · '}{rfq.items?.length || 0} item{rfq.items?.length !== 1 ? 's' : ''}
                  </p>

                  {/* Journey stepper */}
                  {!isClosed ? (
                    <div className="dashboard-journey">
                      {JOURNEY_STEPS.map((label, idx) => (
                        <div key={label} className={`dashboard-journey-step${idx <= step ? ' done' : ''}`}>
                          <span className="dashboard-journey-dot" />
                          <span className="dashboard-journey-label">{label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="dashboard-project-closed">
                      {rfq.status === 'closed' ? '✅ Project completed' : '— Project closed'}
                    </p>
                  )}

                  {/* Chat preview */}
                  {rfq.lastMessagePreview && (
                    <div className="dashboard-chat-preview">
                      <span className="dashboard-chat-preview-sender">
                        {rfq.lastMessageSender === 'customer' ? 'You' : 'HomeU Team'}:
                      </span>
                      <span className="dashboard-chat-preview-text">
                        {rfq.lastMessagePreview.length > 70
                          ? rfq.lastMessagePreview.slice(0, 70) + '…'
                          : rfq.lastMessagePreview}
                      </span>
                      <span className="dashboard-chat-preview-time">{timeAgo(rfq.lastMessageAt)}</span>
                    </div>
                  )}

                  <div className="dashboard-project-actions">
                    <Link href={`/customer/rfq/${rfq.id}`} className="dashboard-project-chat-btn">
                      💬 {hasNewMessage ? <strong>New message</strong> : 'Chat'}
                      {hasNewMessage && <span className="dashboard-new-dot" />}
                    </Link>
                    {relatedQuotation && (
                      <Link href={`/customer/quotation/${relatedQuotation.id}`} className="dashboard-project-quote-btn">
                        View Quotation
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Profile */}
      <section className="dashboard-profile">
        <div className="dashboard-section-heading">
          <h2>My Profile</h2>
          <Link href="/customer/account" className="btn btn--secondary">Edit Profile</Link>
        </div>
        <div className="dashboard-profile-grid">
          <div><strong>Name</strong><span>{customer.name}</span></div>
          <div><strong>Email</strong><span>{customer.email}</span></div>
          <div><strong>Phone</strong><span>{customer.phone || '—'}</span></div>
          <div><strong>Address</strong><span>{customer.address || 'Not set'}</span></div>
        </div>
      </section>

      <p className="dashboard-back-link">
        <Link href="/">&larr; Back to Home</Link>
      </p>
    </main>
  )
}
