/**
 * Admin Customers List Page
 *
 * Server component that displays a paginated, searchable, and sortable
 * table of customers from the `customers` table.
 *
 * Uses `@/lib/db` helpers directly.
 */

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
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
  created_at: string
  updated_at: string
}

interface ListPageProps {
  searchParams: Promise<{
    search?: string
    sort?: string
    page?: string
  }>
}

// ── Helpers ──────────────────────────────────────────────────────────

const ALLOWED_SORT = [
  'name ASC', 'name DESC',
  'email ASC', 'email DESC',
  'created_at DESC', 'created_at ASC',
] as const

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

// ── Page Component ───────────────────────────────────────────────────

export default async function AdminCustomersListPage({ searchParams }: ListPageProps) {
  // Auth check
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const sp = await searchParams
  const search = (sp.search || '').trim()
  const sortRaw = sp.sort || 'name ASC'
  const sort = (ALLOWED_SORT as readonly string[]).includes(sortRaw) ? sortRaw : 'name ASC'
  const currentPage = Math.max(1, parseInt(sp.page || '1', 10) || 1)
  const limit = 20
  const offset = (currentPage - 1) * limit

  // ── Build WHERE clause ─────────────────────────────────────────
  const conditions: string[] = []
  const values: any[] = []
  let idx = 0

  if (search) {
    idx++
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR COALESCE(phone,'') ILIKE $${idx})`)
    values.push(`%${search}%`)
  }

  const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // ── Fetch total count ──────────────────────────────────────────
  let total = 0
  try {
    const countRes = await query(
      `SELECT COUNT(*) as total FROM customers ${whereSQL}`,
      values
    )
    total = parseInt(countRes.rows[0]?.total || '0', 10)
  } catch {
    total = 0
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ── Fetch customers ────────────────────────────────────────────
  let customers: CustomerRow[] = []
  try {
    const customerRes = await query(
      `SELECT * FROM customers ${whereSQL} ORDER BY ${sort} LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...values, limit, offset]
    )
    customers = customerRes.rows as CustomerRow[]
  } catch {
    customers = []
  }

  // ── Build pagination range ─────────────────────────────────────
  const paginationRange = buildPagination(currentPage, totalPages)

  // ── Render ─────────────────────────────────────────────────────
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
                  <SortableHeader label="Name" sortKey="name ASC" currentSort={sort} />
                  <SortableHeader label="Email" sortKey="email ASC" currentSort={sort} />
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Lead Status</th>
                  <SortableHeader label="Created" sortKey="created_at DESC" currentSort={sort} />
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id} style={{ borderBottom: '1px solid #eef1ed' }}>
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
    </main>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

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

/** Pagination link helper */
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
