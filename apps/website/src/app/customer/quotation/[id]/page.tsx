'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface QuotationItem {
  id: string
  itemNumber: number
  description: string
  material?: string
  dimensions?: string
  color?: string
  quantity: number
  unitCost: number
  discountPercent: number
  discountedCost: number
  total: number
}

interface QuotationData {
  id: string
  quotationNumber: string
  customerName: string
  email?: string
  phone?: string
  deliveryLocation?: string
  projectType?: string
  items?: QuotationItem[]
  subtotal: number
  shippingCost: number
  grandTotal: number
  validUntil?: string
  status: string
  sentAt?: string
  createdAt: string
  termsDeliveryLeadtime?: string
  termsPaymentTerms?: string
  termsWarranty?: string
  termsBankDetails?: string
  termsCancellationPolicy?: string
  termsReturnPolicy?: string
  termsRejectionOfItems?: string
  termsRefundPolicy?: string
}

export default function CustomerQuotationPage() {
  const params = useParams()
  const router = useRouter()
  const [quotation, setQuotation] = useState<QuotationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadQuotation() {
      try {
        // Verify logged in
        const meRes = await fetch('/api/customers/me', { credentials: 'include' })
        if (!meRes.ok) {
          router.push('/login')
          return
        }

        const id = params?.id
        if (!id) throw new Error('Quotation ID not found')

        const res = await fetch(`/api/quotations/${id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Quotation not found')

        const data = await res.json()
        setQuotation(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load quotation')
      } finally {
        setLoading(false)
      }
    }

    loadQuotation()
  }, [params?.id, router])

  if (loading) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#666' }}>Loading quotation...</p>
      </main>
    )
  }

  if (error || !quotation) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#c00', padding: '16px', borderRadius: 6 }}>{error || 'Quotation not found'}</div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/customer/dashboard" style={{ color: '#666' }}>&larr; Back to Dashboard</Link>
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/customer/dashboard" style={{ color: '#666' }}>Dashboard</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#222', fontWeight: 600 }}>Quotation {quotation.quotationNumber}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Your Quotation</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
            {quotation.quotationNumber} · {new Date(quotation.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link
          href={`/quotation/${quotation.id}`}
          target="_blank"
          style={{
            padding: '8px 20px',
            background: '#222',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          🖨 View Full & Print
        </Link>
      </div>

      {/* Company Header */}
      <div style={{
        background: '#f9f9f9',
        border: '1px solid #eee',
        borderRadius: 8,
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Home Atelier</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
              56 Valencia QC · Jen Tang
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
              Phone: +63 2 8703 1996 · Email: sales@homeu.ph
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: quotation.status === 'accepted' ? '#27ae60' : quotation.status === 'sent' ? '#5bc0de' : '#f0ad4e',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              {quotation.status}
            </div>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div style={{
        display: 'flex',
        gap: 24,
        marginBottom: 24,
      }}>
        <div style={{ flex: 1, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Client Information</h3>
          <p style={{ margin: '2px 0', fontSize: 14 }}><strong>{quotation.customerName}</strong></p>
          {quotation.phone && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>Phone: {quotation.phone}</p>}
          {quotation.email && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>Email: {quotation.email}</p>}
        </div>
        <div style={{ flex: 1, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Delivery Information</h3>
          {quotation.deliveryLocation && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>{quotation.deliveryLocation}</p>}
          {quotation.projectType && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>Project: {quotation.projectType}</p>}
          {quotation.validUntil && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>Valid Until: {new Date(quotation.validUntil).toLocaleDateString('en-PH')}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Order Details</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 40 }}>#</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 45 }}>QTY</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Unit Cost</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 55 }}>Disc %</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Disc Cost</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items?.map((item, idx) => (
              <tr key={item.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 600 }}>{item.itemNumber}</td>
                <td style={{ padding: '10px 6px' }}>
                  <div>{item.description}</div>
                  {(item.material || item.dimensions || item.color) && (
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                      {[item.material, item.dimensions, item.color].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '10px 6px' }}>
                  ₱{item.unitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 6px', color: '#c00' }}>
                  {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600 }}>
                  ₱{item.discountedCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600 }}>
                  ₱{item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, borderTop: '2px solid #ddd' }}>Subtotal:</td>
              <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, borderTop: '2px solid #ddd' }}>
                ₱{(quotation.subtotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {quotation.shippingCost > 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 12, color: '#555' }}>Shipping / Handling:</td>
                <td colSpan={2} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 12, color: '#555' }}>
                  ₱{quotation.shippingCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, fontSize: 16, borderTop: '3px double #222' }}>Grand Total:</td>
              <td colSpan={2} style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, fontSize: 16, borderTop: '3px double #222' }}>
                ₱{(quotation.grandTotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Thank You */}
      <div style={{
        textAlign: 'center',
        padding: 16,
        marginBottom: 24,
        background: '#f9f9f9',
        border: '1px solid #eee',
        borderRadius: 8,
        fontStyle: 'italic',
        color: '#555',
      }}>
        Thank you for ordering your new beloved furnishing piece at Home Atelier.
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
        <Link href="/customer/dashboard" style={{
          padding: '10px 24px', background: '#f5f5f5', color: '#222',
          borderRadius: 6, textDecoration: 'none', fontSize: 14,
        }}>
          &larr; Back to Dashboard
        </Link>
        {quotation.status !== 'accepted' && quotation.status !== 'rejected' && (
          <a href={`mailto:sales@homeu.ph?subject=Question about Quotation ${quotation.quotationNumber}`}
            style={{
              padding: '10px 24px', background: '#222', color: '#fff',
              borderRadius: 6, textDecoration: 'none', fontSize: 14,
            }}>
            ✉ Reply to Quotation
          </a>
        )}
      </div>
    </main>
  )
}
