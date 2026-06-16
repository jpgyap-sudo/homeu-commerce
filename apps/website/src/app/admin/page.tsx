import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

/**
 * Admin root page — redirects to the dashboard.
 * This ensures /admin never returns 404 (GAP-MED-013).
 */
export default async function AdminPage() {
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  redirect('/admin/dashboard')
}
