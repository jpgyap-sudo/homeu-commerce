export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { loadWorkflowSummary } from '@/lib/workflows'
import type { WorkflowSummary } from '@/lib/workflows'
import { unstable_cache } from 'next/cache'
import WorkflowsDashboard from './WorkflowsDashboard'

const getCachedWorkflowSummary = unstable_cache(
  loadWorkflowSummary,
  ['admin-workflows-summary'],
  { revalidate: 30, tags: ['admin-workflows'] }
)

export default async function AdminWorkflowsPage() {
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const summary: WorkflowSummary = await getCachedWorkflowSummary()

  return <WorkflowsDashboard summary={summary} sessionName={session.name || session.email} />
}
