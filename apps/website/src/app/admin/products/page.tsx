/**
 * Admin Products List Page
 *
 * Server component that displays a paginated, searchable, filterable,
 * and sortable table of products from the `products` table.
 *
 * Uses `@/lib/db` helpers directly for database access.
 */

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query, find } from '@/lib/db'
import Link from 'next/link'
import { DeleteProductButton } from './delete-button'

// ── Types ────────────────────────────────────────────────────────────

interface ProductRow {
  id: number
  title: string
  slug: string
  sku: string | null
  price: number | null
  sale_price: number | null
  show_price: boolean | null
  status: string | null
  vendor: string | null
  product_type: string | null
  category_id: number | null
  dimensions: string | null
  materials: string | null
  created_at: string
  updated_at: string
}

interface CategoryRow {
  id: number
  title: string
  slug: string
}

interface ListPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    category?: string
    sort?: string
    page?: string
  }>
}

// ── Helpers ──────────────────────────────────────────────────────────

const ALLOWED_SORT = [
  'title ASC', 'title DESC',
  'price ASC', 'price DESC',
  'created_at DESC', 'created_at ASC',
  'status ASC', 'status DESC',
  'vendor ASC', 'vendor DESC',
] as const

const STATUS_OPTIONS = ['active', 'draft', 'archived'] as const

function formatPrice(val: number | null): string {
  if (val == null) return '—'
  return `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

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
    active: '🟢 Active',
    draft: '⚪ Draft',
    archived: '🔴 Archived',
  }
  return map[status || ''] || status || '—'
}

// ── Page Component ───────────────────────────────────────────────────

export default async function AdminProductsListPage({ searchParams }: ListPageProps) {
  // Auth check
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const sp = await searchParams
  const search = (sp.search || '').trim()
  const status = sp.status || ''
  const categorySlug = sp.category || ''
  const sortRaw = sp.sort || 'title ASC'
  const sort = (ALLOWED_SORT as readonly string[]).includes(sortRaw) ? sortRaw : 'title ASC'
  const currentPage = Math.max(1, parseInt(sp.page || '1', 10) || 1)
  const limit = 20
  const offset = (currentPage - 1) * limit

  // ── Build WHERE clause ─────────────────────────────────────────
  const conditions: string[] = []
  const values: any[] = []
  let idx = 0

  if (search) {
    idx++
    conditions.push(
      `(LOWER(p.title) LIKE LOWER($${idx}) OR LOWER(COALESCE(p.sku,'')) LIKE LOWER($${idx}) OR LOWER(p.slug) LIKE LOWER($${idx}))`
    )
    values.push(`%${search}%`)
  }

  if (status && (STATUS_OPTIONS as readonly string[]).includes(status as any)) {
    idx++
    conditions.push(`LOWER(p.status) = LOWER($${idx})`)
    values.push(status)
  }

  if (categorySlug) {
    idx++
    conditions.push(`EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND LOWER(c.slug) = LOWER($${idx}))`)
    values.push(categorySlug)
  }

  const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // ── Fetch total count ──────────────────────────────────────────
  let total = 0
  try {
    const countRes = await query(
      `SELECT COUNT(*) as total FROM products p ${whereSQL}`,
      values
    )
    total = parseInt(countRes.rows[0]?.total || '0', 10)
  } catch {
    total = 0
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ── Fetch products ─────────────────────────────────────────────
  let products: ProductRow[] = []
  try {
    const productRes = await query(
      `SELECT p.* FROM products p ${whereSQL} ORDER BY ${sort} LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...values, limit, offset]
    )
    products = productRes.rows as ProductRow[]
  } catch {
    products = []
  }

  // ── Fetch categories for filter dropdown ───────────────────────
  let categories: CategoryRow[] = []
  try {
    categories = await find('categories', {}, { orderBy: 'title ASC' }) as CategoryRow[]
  } catch {
    categories = []
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
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Products</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            {total} product{total !== 1 ? 's' : ''} in catalog
          </p>
        </div>
        <Link
          href="/admin/products/new"
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
          + New Product
        </Link>
      </div>

      {/* Filters */}
      <form
        method="GET"
        action="/admin/products"
        style={{
          display: 'flex', gap: 12, marginBottom: 24,
          flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by title, SKU, or slug..."
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
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          name="category"
          defaultValue={categorySlug}
          style={{
            padding: '10px 14px',
            border: '1.5px solid #d9e0d7',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'inherit',
            background: '#f7f9f6',
            color: '#151a17',
            minWidth: 180,
          }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.slug}>{cat.title}</option>
          ))}
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
        {(search || status || categorySlug) && (
          <Link
            href="/admin/products"
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

      {/* Products Table */}
      {products.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '1px solid #d9e0d7',
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 18, color: '#667168', marginBottom: 8 }}>No products found</p>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 24 }}>
            {search || status || categorySlug
              ? 'Try adjusting your search or filter criteria.'
              : 'Add your first product to the catalog.'}
          </p>
          <Link
            href="/admin/products/new"
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
            Create Product
          </Link>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #d9e0d7' }}>
                  <SortableHeader label="Title" sortKey="title ASC" currentSort={sort} />
                  <SortableHeader label="Price" sortKey="price ASC" currentSort={sort} />
                  <SortableHeader label="Status" sortKey="status ASC" currentSort={sort} />
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Category</th>
                  <SortableHeader label="Vendor" sortKey="vendor ASC" currentSort={sort} />
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>SKU</th>
                  <SortableHeader label="Created" sortKey="created_at DESC" currentSort={sort} />
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f7f9f6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <ProductRowComponent
                    key={product.id}
                    product={product}
                    categories={categories}
                  />
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
                category={categorySlug}
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
                    status={status}
                    category={categorySlug}
                    sort={sort}
                  />
                )
              )}
              <PaginationLink
                page={currentPage + 1}
                label="Next →"
                disabled={currentPage >= totalPages}
                search={search}
                status={status}
                category={categorySlug}
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
        href={`?sort=${encodeURIComponent(nextSort)}${typeof window !== 'undefined' ? window.location.search.replace(/[?&]sort=[^&]*/g, '') : ''}`}
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

/** Individual row with a client delete button, wrapped in a separate component to avoid async issues in map. */
function ProductRowComponent({ product, categories }: { product: ProductRow; categories: CategoryRow[] }) {
  const categoryName = categories.find(c => c.id === product.category_id)?.title || '—'

  return (
    <tr style={{ borderBottom: '1px solid #eef1ed' }}>
      <td style={{ padding: '12px 16px' }}>
        <Link
          href={`/admin/products/${product.id}`}
          style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}
        >
          {product.title}
        </Link>
        <div style={{ fontSize: 12, color: '#667168', marginTop: 2 }}>{product.slug}</div>
      </td>
      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
        {product.sale_price != null
          ? <>{formatPrice(product.sale_price)} {product.price != null && product.sale_price < product.price &&
            <span style={{ textDecoration: 'line-through', color: '#999', fontWeight: 400, fontSize: 12 }}>{formatPrice(product.price)}</span>}</>
          : formatPrice(product.price)
        }
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span className={`status-badge status-${product.status || 'draft'}`}>
          {statusBadge(product.status)}
        </span>
      </td>
      <td style={{ padding: '12px 16px', color: '#667168', fontSize: 13 }}>{categoryName}</td>
      <td style={{ padding: '12px 16px', fontSize: 13 }}>{product.vendor || '—'}</td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: '#667168' }}>{product.sku || '—'}</td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: '#667168' }}>{formatDate(product.created_at)}</td>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link
            href={`/admin/products/${product.id}`}
            style={{ color: '#1a6d3e', fontSize: 13, textDecoration: 'none' }}
          >
            Edit
          </Link>
          <DeleteProductButton productId={product.id} productTitle={product.title} />
        </div>
      </td>
    </tr>
  )
}

/** Pagination link helper */
function PaginationLink({
  page, label, disabled = false, active = false,
  search, status, category, sort,
}: {
  page: number; label: string; disabled?: boolean; active?: boolean;
  search: string; status: string; category: string; sort: string;
}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (category) params.set('category', category)
  if (sort) params.set('sort', sort)
  params.set('page', String(page))
  const href = `/admin/products?${params.toString()}`

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
