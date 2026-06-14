'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
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

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#f0ad4e' },
  sent: { label: 'Sent', color: '#5bc0de' },
  accepted: { label: 'Accepted', color: '#27ae60' },
  rejected: { label: 'Rejected', color: '#e74c3c' },
}

export default function QuotationViewPage() {
  const params = useParams()
  const printRef = useRef<HTMLDivElement>(null)
  const [quotation, setQuotation] = useState<QuotationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadQuotation() {
      try {
        const id = params?.id
        if (!id) throw new Error('Quotation ID not found')

        const res = await fetch(`/api/quotations/${id}`)
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
  }, [params?.id])

  function handlePrint() {
    window.print()
  }

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
        <div style={{ background: '#fee', color: '#c00', padding: '16px', borderRadius: 6 }}>
          {error || 'Quotation not found'}
        </div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/" style={{ color: '#666' }}>&larr; Back to Home</Link>
        </p>
      </main>
    )
  }

  const statusInfo = STATUS_BADGES[quotation.status] || { label: quotation.status, color: '#999' }

  return (
    <>
      {/* ── Print/Back Controls (hidden when printing) ── */}
      <div className="no-print" style={{
        maxWidth: 800,
        margin: '20px auto',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/" style={{ color: '#666', fontSize: 14, textDecoration: 'none' }}>
          &larr; Back to Home
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '8px 20px',
              background: '#222',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            🖨 Print / Export PDF
          </button>
        </div>
      </div>

      {/* ── Quotation Document ── */}
      <div ref={printRef} style={{
        maxWidth: 800,
        margin: '0 auto 60px',
        padding: '40px 48px',
        background: '#fff',
        fontFamily: "'Times New Roman', Georgia, serif",
        fontSize: 13,
        lineHeight: 1.6,
        color: '#222',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '3px solid #222',
          paddingBottom: 20,
          marginBottom: 24,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>HOME ATELIER</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
              56 Valencia QC · Jen Tang
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
              Phone: +63 2 8703 1996 · Email: sales@homeu.ph
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
              QUOTATION
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600 }}>
              {quotation.quotationNumber}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
              Date: {new Date(quotation.createdAt).toLocaleDateString('en-PH', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
            {quotation.validUntil && (
              <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
                Valid Until: {new Date(quotation.validUntil).toLocaleDateString('en-PH', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>

        {/* ── Status Badge (if not draft) ── */}
        {quotation.status !== 'draft' && (
          <div style={{
            textAlign: 'right',
            marginBottom: 16,
          }}>
            <span style={{
              background: statusInfo.color + '20',
              color: statusInfo.color,
              padding: '4px 14px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {statusInfo.label}
            </span>
          </div>
        )}

        {/* ── Client & Delivery Info ── */}
        <div style={{
          display: 'flex',
          gap: 40,
          marginBottom: 28,
          padding: '16px 20px',
          background: '#fafafa',
          border: '1px solid #eee',
          borderRadius: 4,
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Client Information
            </h3>
            <p style={{ margin: '2px 0', fontSize: 14 }}><strong>{quotation.customerName}</strong></p>
            {quotation.phone && <p style={{ margin: '2px 0', color: '#555' }}>Phone: {quotation.phone}</p>}
            {quotation.email && <p style={{ margin: '2px 0', color: '#555' }}>Email: {quotation.email}</p>}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Delivery Information
            </h3>
            {quotation.deliveryLocation && (
              <p style={{ margin: '2px 0', color: '#555' }}>{quotation.deliveryLocation}</p>
            )}
            {quotation.projectType && (
              <p style={{ margin: '2px 0', color: '#555' }}>
                Project Type: {quotation.projectType.charAt(0).toUpperCase() + quotation.projectType.slice(1)}
              </p>
            )}
          </div>
        </div>

        {/* ── Items Table ── */}
        <h3 style={{
          fontSize: 14,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          borderBottom: '2px solid #222',
          paddingBottom: 6,
          marginBottom: 12,
        }}>
          Order Details
        </h3>

        {(!quotation.items || quotation.items.length === 0) ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>No items in this quotation.</p>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            marginBottom: 20,
          }}>
            <thead>
              <tr style={{
                borderBottom: '2px solid #222',
                background: '#f5f5f5',
              }}>
                <th style={{ textAlign: 'center', padding: '8px 6px', width: 40, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Item #</th>
                <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '8px 6px', width: 40, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>QTY</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', width: 80, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Unit Cost</th>
                <th style={{ textAlign: 'center', padding: '8px 6px', width: 50, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Disc %</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', width: 80, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Disc Cost</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', width: 80, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, idx) => {
                const descParts = []
                if (item.description) descParts.push(item.description)
                if (item.material || item.dimensions || item.color) {
                  const details = [item.material, item.dimensions, item.color].filter(Boolean).join(' · ')
                  if (details) descParts.push(`(${details})`)
                }
                return (
                  <tr key={item.id || idx} style={{
                    borderBottom: '1px solid #ddd',
                  }}>
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
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, borderTop: '2px solid #222' }}>
                  Subtotal:
                </td>
                <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, borderTop: '2px solid #222' }}>
                  ₱{quotation.subtotal?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                </td>
              </tr>
              {quotation.shippingCost > 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', padding: '6px 12px', color: '#555', fontSize: 12 }}>
                    Shipping / Handling:
                  </td>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '6px 12px', color: '#555', fontSize: 12 }}>
                    ₱{quotation.shippingCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={5} style={{
                  textAlign: 'right', padding: '12px 12px',
                  fontWeight: 700, fontSize: 16,
                  borderTop: '3px double #222',
                }}>
                  Grand Total:
                </td>
                <td colSpan={2} style={{
                  textAlign: 'right', padding: '12px 12px',
                  fontWeight: 700, fontSize: 16,
                  borderTop: '3px double #222',
                }}>
                  ₱{quotation.grandTotal?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* ── Thank You Note ── */}
        <div style={{
          textAlign: 'center',
          padding: '16px 0',
          marginBottom: 28,
          borderTop: '1px solid #ddd',
          borderBottom: '1px solid #ddd',
          fontStyle: 'italic',
          color: '#555',
        }}>
          Thank you for ordering your new beloved furnishing piece at Home Atelier.
        </div>

        {/* ── Terms & Conditions ── */}
        <div style={{ marginTop: 28 }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            borderBottom: '2px solid #222',
            paddingBottom: 6,
            marginBottom: 12,
          }}>
            Terms & Conditions
          </h3>

          <div style={{ display: 'grid', gap: 14 }}>
            {quotation.termsDeliveryLeadtime && (
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Delivery Leadtime</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444' }}>{quotation.termsDeliveryLeadtime}</p>
              </div>
            )}

            {quotation.termsPaymentTerms && (
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Payment Terms</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444', whiteSpace: 'pre-wrap' }}>{quotation.termsPaymentTerms}</p>
              </div>
            )}

            {quotation.termsWarranty && (
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Warranty</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444' }}>{quotation.termsWarranty}</p>
              </div>
            )}

            {quotation.termsBankDetails && (
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Bank Details</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {quotation.termsBankDetails}
                </p>
              </div>
            )}

            {quotation.termsCancellationPolicy && (
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Cancellation Policy</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444' }}>{quotation.termsCancellationPolicy}</p>
              </div>
            )}

            {quotation.termsReturnPolicy && (
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Return Policy</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444' }}>{quotation.termsReturnPolicy}</p>
              </div>
            )}

            {quotation.termsRejectionOfItems && (
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Rejection of Items</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444' }}>{quotation.termsRejectionOfItems}</p>
              </div>
            )}

            {quotation.termsRefundPolicy && (
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Refund Policy</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444' }}>{quotation.termsRefundPolicy}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          marginTop: 40,
          paddingTop: 16,
          borderTop: '1px solid #ddd',
          textAlign: 'center',
          fontSize: 11,
          color: '#999',
        }}>
          <p style={{ margin: 0 }}>56 Valencia QC · Jen Tang · Phone: +63 2 8703 1996 · Email: sales@homeu.ph</p>
          <p style={{ margin: '4px 0 0' }}>Home Atelier — {quotation.quotationNumber}</p>
        </div>
      </div>

      {/* ── Print Styles ── */}
      <style jsx global>{`
        @media print {
          body { background: #fff; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          @page { margin: 15mm; }
        }
      `}</style>
    </>
  )
}
