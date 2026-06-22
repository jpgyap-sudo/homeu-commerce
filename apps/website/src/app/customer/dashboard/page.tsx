'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address?: string
}

interface RFQ {
  id: string
  customerName: string
  status: string
  estimatedTotal: number
  createdAt: string
  items?: Array<{ productTitleSnapshot?: string; quantity: number }>
}

const STATUS_LABELS: Record<string, string> = {
  new: '🟡 New',
  contacted: '🔵 Contacted',
  quoted: '🟣 Quoted',
  quotation_sent: '🟢 Quotation Sent',
  closed_won: '✅ Closed (Won)',
  closed_lost: '❌ Closed (Lost)',
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Get current logged-in customer
        const meRes = await fetch('/api/customers/me', { credentials: 'include' })
        if (meRes.status === 401) {
          router.push('/login')
          return
        }
        if (!meRes.ok) {
          const meError = await meRes.json().catch(() => null)
          throw new Error(meError?.error || 'Failed to load your account profile')
        }
        const meData = await meRes.json()
        const user = meData?.user || meData
        if (!user || !user.id) {
          // Session exists but no customer/lead found — log them out gracefully
          setError('Your account profile could not be found. Please contact support.')
          setLoading(false)
          return
        }
        setCustomer(user)

        // Fetch this customer's RFQs via the new rfq-requests endpoint
        try {
          const rfqRes = await fetch('/api/rfq-requests?limit=50', {
            credentials: 'include',
          })
          if (!rfqRes.ok) {
            const rfqError = await rfqRes.json().catch(() => null)
            throw new Error(rfqError?.error || 'Failed to load quotation requests')
          }
          const rfqData = await rfqRes.json()
          setRfqs(rfqData.rfqs || [])
        } catch (rfqError: any) {
          setError(rfqError.message || 'Failed to load quotation requests')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  async function handleLogout() {
    await fetch('/api/customers/logout', { method: 'POST', credentials: 'include' })
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#666' }}>Loading dashboard...</p>
      </main>
    )
  }

  if (!customer) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <h1>We couldn&apos;t load your account</h1>
        <p style={{ color: '#666' }}>{error || 'Please reload to try again.'}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 18px', border: 0, borderRadius: 6, background: '#222', color: '#fff', cursor: 'pointer' }}
        >
          Reload
        </button>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ margin: 0 }}>Welcome, {customer.name}</h1>
          <p style={{ color: '#666', margin: '4px 0 0' }}>{customer.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/"
            style={{
              padding: '8px 16px',
              background: '#f5f5f5',
              color: '#222',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Browse Products
          </Link>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#c00',
              border: '1px solid #c00',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Customer Info Card */}
      <div style={{
        background: '#f9f9f9',
        border: '1px solid #eee',
        borderRadius: 8,
        padding: 20,
        marginBottom: 32,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>My Profile</h2>
          <Link href="/customer/account" style={{
            fontSize: 13, fontWeight: 600, color: '#1a6d3e', textDecoration: 'none',
            border: '1.5px solid #1a6d3e', borderRadius: 8, padding: '6px 14px',
          }}>
            Edit Profile
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div><strong>Name:</strong> {customer.name}</div>
          <div><strong>Email:</strong> {customer.email}</div>
          <div><strong>Phone:</strong> {customer.phone}</div>
          <div><strong>Address:</strong> {customer.address || '(not set)'}</div>
        </div>
      </div>

      {/* RFQ History */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>My Quotation Requests</h2>
          <Link
            href="/products"
            style={{
              padding: '8px 16px',
              background: '#222',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            + New RFQ
          </Link>
        </div>

        {error && (
          <div style={{ background: '#fee', color: '#c00', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        {rfqs.length === 0 ? (error ? null : (
          <div style={{
            background: '#f9f9f9',
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 40,
            textAlign: 'center',
            color: '#666',
          }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>No quotation requests yet.</p>
            <p style={{ fontSize: 14 }}>Browse our products and submit your first RFQ.</p>
          </div>
        )) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rfqs.map(rfq => (
              <Link
                key={rfq.id}
                href={`/customer/rfq/${rfq.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#222',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#222' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee' }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    RFQ #{rfq.id.slice(-6).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    {new Date(rfq.createdAt).toLocaleDateString('en-PH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {' · '}
                    {rfq.items?.length || 0} item(s)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {STATUS_LABELS[rfq.status] || rfq.status}
                  </div>
                  {rfq.estimatedTotal > 0 && (
                    <div style={{ fontSize: 13, color: '#666' }}>
                      ₱{rfq.estimatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/" style={{ color: '#666', fontSize: 14 }}>
          &larr; Back to Home
        </Link>
      </p>
    </main>
  )
}
