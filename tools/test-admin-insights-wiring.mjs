import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
let passed = 0
let failed = 0

function source(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function check(name, condition) {
  if (condition) {
    passed++
    console.log(`PASS ${name}`)
  } else {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('canonical insights/workflows migration exists', existsSync(resolve(root, 'tools/migrate/migrations/012_insights_workflows_runtime.sql')))

const rootLayout = source('apps/website/src/app/layout.tsx')
check('storefront mounts page-view tracking', rootLayout.includes('<PageViewTracker'))
check('storefront mounts live-visitor heartbeat tracking', rootLayout.includes('<LiveVisitorTracker'))

const appointmentService = source('apps/website/src/lib/chatbot/appointment-service.ts')
check('appointment requests insert durable records', /query\(\s*`INSERT\s+INTO\s+chatbot\.appointments/i.test(appointmentService))
check('appointment alerts resolve the lead name', !appointmentService.includes('leadName: input.leadId'))

const appointmentsRoute = source('apps/website/src/app/api/appointments/route.ts')
check('appointment list supports direct lead filtering', appointmentsRoute.includes("searchParams.get('leadId')"))
check('appointment count uses an explicit count query', appointmentsRoute.includes('const countSql = `SELECT COUNT(*) as count'))

const appointmentDetail = source('apps/website/src/app/api/appointments/[id]/route.ts')
check('appointment detail uses the mobile lead column', appointmentDetail.includes('l.mobile as lead_mobile'))
check('appointment detail supports updates', appointmentDetail.includes('export async function PATCH'))

const leadDetailPath = resolve(root, 'apps/website/src/app/api/leads/[id]/route.ts')
check('lead detail API exists', existsSync(leadDetailPath))
if (existsSync(leadDetailPath)) {
  const leadDetail = readFileSync(leadDetailPath, 'utf8')
  check('lead detail supports updates', leadDetail.includes('export async function PATCH'))
}

const leadPage = source('apps/website/src/app/admin/collections/leads/[id]/page.tsx')
check('lead detail fetches its direct endpoint', leadPage.includes('fetch(`/api/leads/${leadId}`'))

const appointmentPage = source('apps/website/src/app/admin/collections/appointments/[id]/page.tsx')
check('appointment detail fetches its direct endpoint', appointmentPage.includes('fetch(`/api/appointments/${apptId}`'))

const analyticsOverview = source('apps/website/src/app/admin/analytics/page.tsx')
check('analytics excludes admin page views', analyticsOverview.includes('is_admin = FALSE'))
check('analytics exposes query failures', analyticsOverview.includes('emptyAnalytics(error?: string)') && analyticsOverview.includes('role="alert"'))

const reportApiPath = resolve(root, 'apps/website/src/app/api/admin/analytics/reports/route.ts')
check('analytics report API exists', existsSync(reportApiPath))

const workflowApi = source('apps/website/src/app/api/admin/workflows/tasks/route.ts')
check('workflow task API supports creation', workflowApi.includes('export async function POST'))

const workflows = source('apps/website/src/lib/workflows.ts')
check('workflow updates verify affected rows', /rowCount/.test(workflows))
check('workflows do not expose synthetic negative task IDs', !workflows.includes('id: -1'))
check('workflow timestamps support schemas', /lastUpdated\([^)]*schema/.test(workflows))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
