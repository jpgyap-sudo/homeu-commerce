/**
 * Admin Pages List Page
 *
 * Server component that displays a paginated, searchable, filterable table
 * of pages from the `pages` table.
 *
 * Uses `@/lib/db` helpers directly.
 */

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────

interface PageRow {
  id: number
  title: string
  slug: string
  content: string | null
  status: string | null
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

interface ListPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

// ── Helpers ──────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['draft', 'published'] as const

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}

function statusBadge(status: string | null): string {
  const map: Record<string, string> = {
    published: '🟢 Published',
    draft: '⚪ Draft',
  }
  return map[status || ''] || status || '—'
}

// ── Page Component ───────────────────────────────────────────────────

export default async function AdminPagesListPage({ searchParams }: ListPageProps) {
  // Auth check
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const sp = await searchParams
  const search = (sp.search || '').trim()
  const status = sp.status || ''
  const currentPage = Math.max(1, parseInt(sp.page || '1', 10) || 1)
  const limit = 20
  const offset = (currentPage - 1) * limit

  // ── Build WHERE clause ─────────────────────────────────────────
  const conditions: string[] = []
  const values: any[] = []
  let idx = 0

  if (search) {
    idx++
    conditions.push(`(LOWER(p.title) LIKE LOWER($${idx}) OR LOWER(p.slug) LIKE LOWER($${idx}))`)
    values.push(`%${search}%`)
  }

  if (status && (STATUS_OPTIONS as readonly string[]).includes(status as any)) {
    idx++
    conditions.push(`LOWER(p.status) = LOWER($${idx})`)
    values.push(status)
  }

  const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // ── Fetch total count ──────────────────────────────────────────
  let total = 0
  try {
    const countRes = await query(
      `SELECT COUNT(*) as total FROM pages p ${whereSQL}`,
      values
    )
    total = parseInt(countRes.rows[0]?.total || '0', 10)
  } catch {
    total = 0
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ── Fetch pages ────────────────────────────────────────────────
  let pages: PageRow[] = []
  try {
    const pagesRes = await query(
      `SELECT p.* FROM pages p ${whereSQL} ORDER BY p.created_at DESC LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...values, limit, offset]
    )
    pages = pagesRes.rows as PageRow[]
  } catch {
    pages = []
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
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Pages</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            {total} page{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/pages/new"
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
          + New Page
        </Link>
      </div>

      {/* Filters */}
      <form
        method="GET"
        action="/admin/pages"
        style={{
          display: 'flex', gap: 12, marginBottom: 24,
          flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by title or slug..."
          style={{
            flex: '1 1 260px',
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
        <select
          name="status"
          defaultValue={status}
          style={{
            padding: '10px 14px',
            border: '1.5px solid #d9e0d7',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'inherit',
            background: '#f7f9f6',
            color: '#151a17',
            minWidth: 130,
          }}
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
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
        {(search || status) && (
          <Link
            href="/admin/pages"
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

      {/* Pages Table */}
      {pages.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '1px solid #d9e0d7',
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 18, color: '#667168', marginBottom: 8 }}>No pages found</p>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 24 }}>
            {search || status
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first page.'}
          </p>
          <Link
            href="/admin/pages/new"
            style={{
              padding: '10px 24px',
              background: '#151a17',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Create Page
          </Link>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #d9e0d7' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Slug</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Created</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map(page => (
                  <tr key={page.id} style={{ borderBottom: '1px solid #eef1ed' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/admin/pages/${page.id}`}
                        style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {page.title}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#667168' }}>{page.slug}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-badge status-${page.status || 'draft'}`}>
                        {statusBadge(page.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#667168' }}>{formatDate(page.created_at)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <Link
                        href={`/admin/pages/${page.id}`}
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
                status={status}
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
                    status={status}
                  />
                )
              )}
              <PaginationLink
                page={currentPage + 1}
                label="Next →"
                disabled={currentPage >= totalPages}
                search={search}
                status={status}
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

function PaginationLink({
  page, label, disabled = false, active = false,
  search, status,
}: {
  page: number; label: string; disabled?: boolean; active?: boolean;
  search: string; status: string;
}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  params.set('page', String(page))
  const href = `/admin/pages?${params.toString()}`

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
