import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  if (!(await getSession())) redirect('/admin/login')
  return <ReportsClient />
}
