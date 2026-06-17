import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { loadWorkflowSummary } from '@/lib/workflows'
import type { WorkflowSummary } from '@/lib/workflows'
import WorkflowsDashboard from './WorkflowsDashboard'

export default async function AdminWorkflowsPage() {
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const summary: WorkflowSummary = await loadWorkflowSummary()

  return <WorkflowsDashboard summary={summary} sessionName={session.name || session.email} />
}
