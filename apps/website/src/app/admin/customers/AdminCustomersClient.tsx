'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────

interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  lead_status: string | null
  notes: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

interface Props {
  customers: CustomerRow[]
  total: number
  search: string
  sort: string
  currentPage: number
  totalPages: number
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}

function leadStatusBadge(status: string | null): string {
  const map: Record<string, string> = {
    new: '🆕 New',
    contacted: '📞 Contacted',
    qualified: '✅ Qualified',
    quoted: '📄 Quoted',
    won: '🏆 Won',
    lost: '❌ Lost',
    lead: '⭐ Lead',
  }
  return map[status || ''] || status || '—'
}

function buildPagination(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  if (total > 1) pages.push(total)
  return pages
}

// ── Sub-components ───────────────────────────────────────────────────

function SortableHeader({ label, sortKey, currentSort }: { label: string; sortKey: string; currentSort: string }) {
  const isAsc = currentSort === sortKey
  const isDesc = currentSort === sortKey.replace(' ASC', ' DESC')
  const isActive = isAsc || isDesc
  const nextSort = isAsc ? sortKey.replace(' ASC', ' DESC') : sortKey

  return (
    <th style={{
      textAlign: 'left', padding: '12px 16px',
      fontSize: 11, fontWeight: 600, color: '#667168',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      background: '#f7f9f6',
    }}>
      <a
        href={`?sort=${encodeURIComponent(nextSort)}`}
        style={{
          color: isActive ? '#1a6d3e' : '#667168',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {label}
        {isActive && <span style={{ fontSize: 10 }}>{isAsc ? '▲' : '▼'}</span>}
      </a>
    </th>
  )
}

function PaginationLink({
  page, label, disabled = false, active = false,
  search, sort,
}: {
  page: number; label: string; disabled?: boolean; active?: boolean;
  search: string; sort: string;
}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  params.set('page', String(page))
  const href = `/admin/customers?${params.toString()}`

  const baseStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: active ? 700 : 400,
    textDecoration: 'none',
    color: active ? '#fff' : '#151a17',
    background: active ? '#1a6d3e' : 'transparent',
    border: active ? 'none' : '1px solid #d9e0d7',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 150ms ease',
  }

  if (disabled) {
    return <span style={baseStyle}>{label}</span>
  }

  return <Link href={href} style={baseStyle}>{label}</Link>
}

// ── OTP Modal ────────────────────────────────────────────────────────

function OtpVerificationModal({
  selectedCount,
  onVerified,
  onCancel,
}: {
  selectedCount: number
  onVerified: () => void
  onCancel: () => void
}) {
  const [step, setStep] = useState<'sending' | 'input' | 'verifying' | 'deleting' | 'done' | 'error'>('sending')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  // Fetch admin email and send OTP on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const meRes = await fetch('/api/admin/me')
        const meData = await meRes.json()
        const email = meData.user?.email
        if (!email) throw new Error('Could not determine admin email')
        if (cancelled) return
        setAdminEmail(email)

        const otpRes = await fetch('/api/admin/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, action: 'generate' }),
        })
        const otpData = await otpRes.json()
        if (!otpRes.ok) throw new Error(otpData.error || 'Failed to send OTP')
        if (cancelled) return
        setStep('input')
      } catch (err: any) {
        if (cancelled) return
        setError(err.message || 'Failed to send verification code')
        setStep('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Verify OTP then delete
  const handleVerify = useCallback(async () => {
    if (!code.trim() || code.length < 4) {
      setError('Please enter the verification code')
      return
    }
    setStep('verifying')
    setError('')

    try {
      const verifyRes = await fetch('/api/admin/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, action: 'verify', code: code.trim() }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid code')

      // OTP verified — proceed with deletion
      setStep('deleting')
      const delRes = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [], // We pass nothing here — the parent must have already sent IDs
        }),
      })
      if (!delRes.ok) {
        const delData = await delRes.json().catch(() => ({}))
        throw new Error(delData.error || 'Failed to delete customers')
      }

      setStep('done')
      setTimeout(() => onVerified(), 1000)
    } catch (err: any) {
      setError(err.message || 'Verification failed')
      setStep('input')
    }
  }, [code, adminEmail, onVerified])

  const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  }

  const modalCard: React.CSSProperties = {
    background: '#fff', borderRadius: 12, maxWidth: 420, width: '100%',
    padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    textAlign: 'center',
  }

  return (
    <div style={modalOverlay} onClick={onCancel}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        {step === 'sending' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#151a17' }}>
              Sending verification code...
            </h3>
            <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>
              A one-time code is being sent to your email.
            </p>
          </>
        )}

        {step === 'input' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: '#151a17' }}>
              Confirm Deletion
            </h3>
            <p style={{ color: '#667168', fontSize: 14, margin: '0 0 20px' }}>
              Enter the verification code sent to <strong>{adminEmail}</strong> to delete {selectedCount} customer{selectedCount !== 1 ? 's' : ''}.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{
                width: '100%', maxWidth: 200,
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: 24, fontWeight: 700, letterSpacing: 8,
                border: '2px solid #d9e0d7',
                borderRadius: 10,
                outline: 'none',
                fontFamily: 'monospace',
                color: '#151a17',
                background: '#f7f9f6',
              }}
            />
            {error && (
              <p style={{ color: '#b42318', fontSize: 13, margin: '12px 0 0' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
              <button
                onClick={onCancel}
                style={{
                  padding: '10px 24px',
                  background: '#f5f5f5',
                  color: '#151a17',
                  borderRadius: 8,
                  border: '1px solid #d9e0d7',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={code.length < 4}
                style={{
                  padding: '10px 24px',
                  background: code.length < 4 ? '#ccc' : 'linear-gradient(180deg, #dc2626, #b91c1c)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: code.length < 4 ? 'not-allowed' : 'pointer',
                  boxShadow: code.length < 4 ? 'none' : '0 4px 14px rgba(220,38,38,0.35)',
                }}
              >
                Verify & Delete
              </button>
            </div>
          </>
        )}

        {(step === 'verifying' || step === 'deleting') && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#151a17' }}>
              {step === 'verifying' ? 'Verifying code...' : 'Deleting customers...'}
            </h3>
            <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>
              Please wait while we process your request.
            </p>
          </>
        )}

        {step === 'done' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#151a17' }}>
              Customers Deleted
            </h3>
            <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>
              {selectedCount} customer{selectedCount !== 1 ? 's' : ''} deleted successfully.
            </p>
          </>
        )}

        {step === 'error' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#b42318' }}>
              Error
            </h3>
            <p style={{ color: '#667168', fontSize: 14, margin: '0 0 16px' }}>{error}</p>
            <button
              onClick={onCancel}
              style={{
                padding: '10px 24px',
                background: '#151a17',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────

export default function AdminCustomersClient({ customers, total, search, sort, currentPage, totalPages }: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [bulkError, setBulkError] = useState('')

  // Compute visible IDs for "select all"
  const visibleIds = customers.map(c => c.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      // Select all visible
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  const handleDeleteClick = () => {
    if (selectedIds.size === 0) return
    setBulkError('')
    setShowOtpModal(true)
  }

  const handleDeleteVerified = async () => {
    // OTP was verified — send IDs and delete
    setShowOtpModal(false)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete customers')
      }
      setSelectedIds(new Set())
      router.refresh()
    } catch (err: any) {
      setBulkError(err.message || 'Failed to delete customers')
    }
  }

  const paginationRange = buildPagination(currentPage, totalPages)

  // ── Styles ──────────────────────────────────────────────────────────
  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '12px 16px',
    fontSize: 11, fontWeight: 600, color: '#667168',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    background: '#f7f9f6',
  }

  const checkboxStyle: React.CSSProperties = {
    width: 18, height: 18, cursor: 'pointer',
    accentColor: '#1a6d3e',
  }

  return (
    <main style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 32, flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Customers</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            {total} customer{total !== 1 ? 's' : ''} in database
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteClick}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 24px',
                background: 'linear-gradient(180deg, #dc2626, #b91c1c)',
                color: '#fff',
                borderRadius: 10,
                border: 'none',
                fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(220,38,38,0.35)',
              }}
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <Link
            href="/admin/customers/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 24px',
              background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)',
              color: '#fff',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(26,109,62,0.35)',
            }}
          >
            + New Customer
          </Link>
        </div>
      </div>

      {/* Bulk action error */}
      {bulkError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#b42318',
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14,
        }}>
          {bulkError}
        </div>
      )}

      {/* Search */}
      <form
        method="GET"
        action="/admin/customers"
        style={{
          display: 'flex', gap: 12, marginBottom: 24,
          flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by name, email, or phone..."
          style={{
            flex: '1 1 320px',
            padding: '10px 14px',
            border: '1.5px solid #d9e0d7',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
            background: '#f7f9f6',
            color: '#151a17',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            background: '#151a17',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
        {search && (
          <Link
            href="/admin/customers"
            style={{
              padding: '10px 16px',
              color: '#667168',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Clear
          </Link>
        )}
      </form>

      {/* Customers Table */}
      {customers.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '1px solid #d9e0d7',
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 18, color: '#667168', marginBottom: 8 }}>No customers found</p>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 24 }}>
            {search
              ? 'Try adjusting your search criteria.'
              : 'No customers have been registered yet.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #d9e0d7' }}>
                  <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      style={checkboxStyle}
                      title="Select all visible"
                    />
                  </th>
                  <SortableHeader label="Name" sortKey="name ASC" currentSort={sort} />
                  <SortableHeader label="Email" sortKey="email ASC" currentSort={sort} />
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Lead Status</th>
                  <SortableHeader label="Created" sortKey="created_at DESC" currentSort={sort} />
                  <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id} style={{ borderBottom: '1px solid #eef1ed' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        style={checkboxStyle}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#667168', fontSize: 13 }}>{customer.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{customer.phone || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {customer.tags && customer.tags.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {customer.tags.map(tag => (
                            <span key={tag} style={{
                              padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                              background: tag === 'designer' ? '#e8f4fd' : tag === 'vip' ? '#fef3c7' : '#f3f4f6',
                              color: tag === 'designer' ? '#1e40af' : tag === 'vip' ? '#92400e' : '#4b5563',
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#9aa69c' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-badge status-${customer.lead_status || 'new'}`}>
                        {leadStatusBadge(customer.lead_status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#667168' }}>{formatDate(customer.created_at)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        style={{ color: '#1a6d3e', fontSize: 13, textDecoration: 'none' }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 4, marginTop: 24, flexWrap: 'wrap',
            }}>
              <PaginationLink
                page={currentPage - 1}
                label="← Prev"
                disabled={currentPage <= 1}
                search={search}
                sort={sort}
              />
              {paginationRange.map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '6px 8px', color: '#667168', fontSize: 14 }}>…</span>
                ) : (
                  <PaginationLink
                    key={p}
                    page={p}
                    label={String(p)}
                    active={p === currentPage}
                    search={search}
                    sort={sort}
                  />
                )
              )}
              <PaginationLink
                page={currentPage + 1}
                label="Next →"
                disabled={currentPage >= totalPages}
                search={search}
                sort={sort}
              />
            </div>
          )}
        </>
      )}

      {/* Back */}
      <p style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/admin/dashboard" style={{ color: '#667168', fontSize: 14 }}>
          &larr; Back to Dashboard
        </Link>
      </p>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <OtpVerificationModal
          selectedCount={selectedIds.size}
          onVerified={handleDeleteVerified}
          onCancel={() => setShowOtpModal(false)}
        />
      )}
    </main>
  )
}
