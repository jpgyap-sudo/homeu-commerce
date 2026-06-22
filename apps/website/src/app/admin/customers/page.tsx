/**
 * Admin Customers List Page
 *
 * Server component that fetches paginated, searchable customer data
 * and renders the interactive client component.
 */

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import AdminCustomersClient from './AdminCustomersClient'

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

interface ListPageProps {
  searchParams: Promise<{
    search?: string
    sort?: string
    page?: string
  }>
}

// ── Constants ────────────────────────────────────────────────────────

const ALLOWED_SORT = [
  'name ASC', 'name DESC',
  'email ASC', 'email DESC',
  'created_at DESC', 'created_at ASC',
] as const

const LIMIT = 20

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
  const offset = (currentPage - 1) * LIMIT

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

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // ── Fetch customers ────────────────────────────────────────────
  let customers: CustomerRow[] = []
  try {
    const customerRes = await query(
      `SELECT * FROM customers ${whereSQL} ORDER BY ${sort} LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...values, LIMIT, offset]
    )
    customers = customerRes.rows as CustomerRow[]
  } catch {
    customers = []
  }

  // ── Render via client component ────────────────────────────────
  return (
    <AdminCustomersClient
      customers={customers}
      total={total}
      search={search}
      sort={sort}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  )
}
