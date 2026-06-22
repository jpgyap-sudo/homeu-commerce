'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RFQ {
  id: string
  status: string
  estimatedTotal: number | null
  createdAt: string
  items?: Array<{ productTitleSnapshot?: string; quantity: number }>
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:             { label: 'Received',        color: '#e8a020' },
  contacted:       { label: 'In Review',       color: '#3b82f6' },
  quoted:          { label: 'Quoted',          color: '#8b5cf6' },
  quotation_sent:  { label: 'Quotation Sent',  color: '#10b981' },
  closed_won:      { label: 'Completed',       color: '#059669' },
  closed_lost:     { label: 'Cancelled',       color: '#6b7280' },
}

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/customers/me', { credentials: 'include' })
      .then(async r => {
        if (r.status === 401) { router.push('/login'); return null }
        if (!r.ok) {
          const data = await r.json().catch(() => null)
          throw new Error(data?.error || 'Failed to load your account profile')
        }
        return r.json()
      })
      .then(async user => {
        if (!user) return
        const res = await fetch('/api/rfq-requests?limit=50', { credentials: 'include' })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Failed to load order history')
        }
        const data = await res.json()
        setRfqs(data.rfqs || [])
      })
      .catch(err => setError(err.message || 'Failed to load order history'))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <div className="account-page page-width">
      <nav className="account-nav">
        <Link href="/customer/dashboard" className="account-nav__link">My Requests</Link>
        <Link href="/customer/account" className="account-nav__link">Account Details</Link>
        <Link href="/customer/addresses" className="account-nav__link">Addresses</Link>
        <Link href="/customer/orders" className="account-nav__link account-nav__link--active">Order History</Link>
      </nav>

      <div className="account-content">
        <h1 className="account-title">Order History</h1>
        <p className="account-subtitle">
          All your RFQ requests and quotations. For status updates, contact our team.
        </p>

        {error && <p className="account-error" role="alert">{error}</p>}

        {loading ? (
          <p className="account-loading">Loading…</p>
        ) : error ? null : rfqs.length === 0 ? (
          <div className="account-empty">
            <p>No requests yet.</p>
            <Link href="/products" className="btn btn--primary" style={{ marginTop: 16 }}>Browse Products</Link>
          </div>
        ) : (
          <div className="orders-list">
            {rfqs.map(rfq => {
              const st = STATUS_LABELS[rfq.status] || { label: rfq.status, color: '#888' }
              return (
                <div key={rfq.id} className="order-card">
                  <div className="order-card__header">
                    <div>
                      <p className="order-card__id">Request #{String(rfq.id).slice(-6).toUpperCase()}</p>
                      <p className="order-card__date">
                        {new Date(rfq.createdAt).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="order-card__status" style={{ color: st.color, borderColor: st.color }}>
                      {st.label}
                    </span>
                  </div>

                  {rfq.items && rfq.items.length > 0 && (
                    <ul className="order-card__items">
                      {rfq.items.slice(0, 3).map((item, i) => (
                        <li key={i} className="order-card__item">
                          <span>{item.productTitleSnapshot || 'Item'}</span>
                          <span className="order-card__item-qty">×{item.quantity}</span>
                        </li>
                      ))}
                      {rfq.items.length > 3 && (
                        <li className="order-card__item order-card__item--more">
                          +{rfq.items.length - 3} more items
                        </li>
                      )}
                    </ul>
                  )}

                  <div className="order-card__footer">
                    {rfq.estimatedTotal != null && (
                      <span className="order-card__total">
                        Est. ₱{rfq.estimatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                      </span>
                    )}
                    <Link href={`/customer/rfq/${rfq.id}`} className="order-card__link">
                      View Details →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
