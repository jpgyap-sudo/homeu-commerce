/**
 * Workflow Data Layer — DaVinciOS
 *
 * Aggregates real-time counts and status across all website features
 * for the Workflows admin dashboard. Each feature provides:
 *   - Total records
 *   - Status distribution (from the native table's status column)
 *   - Most recent record timestamp
 *   - Defined workflow tasks from workflow_tasks table
 */

import { query } from './db'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FeatureWorkflow {
  slug: string
  title: string
  icon: string
  description: string
  category: string
  sortOrder: number
  totalCount: number
  statusDistribution: Record<string, number>
  lastUpdated: string | null
  tasks: WorkflowTask[]
  completionPercent: number
}

export interface WorkflowTask {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  assignee: string | null
  dueDate: string | null
  metadata: Record<string, any>
  sortOrder: number
  isAutomated: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkflowSummary {
  features: FeatureWorkflow[]
  totalFeatures: number
  activeTasks: number
  completedTasks: number
  blockedTasks: number
  categories: Record<string, FeatureWorkflow[]>
}

// ── Feature-specific aggregators ───────────────────────────────────────────────

type QueryResult = { rows: any[] }

async function countTable(table: string): Promise<number> {
  try {
    const r = await query(`SELECT COUNT(*) as count FROM "${table}"`)
    return Number(r.rows[0]?.count || 0)
  } catch {
    return 0
  }
}

async function statusDistribution(table: string, statusCol = 'status'): Promise<Record<string, number>> {
  try {
    const r = await query(
      `SELECT ${statusCol}, COUNT(*) as count FROM "${table}" GROUP BY ${statusCol} ORDER BY ${statusCol}`
    )
    const dist: Record<string, number> = {}
    for (const row of r.rows) {
      dist[row[statusCol]] = Number(row.count)
    }
    return dist
  } catch {
    return {}
  }
}

async function lastUpdated(table: string, col = 'updated_at'): Promise<string | null> {
  try {
    const r = await query(`SELECT ${col} FROM "${table}" ORDER BY ${col} DESC LIMIT 1`)
    return r.rows[0]?.[col] ? String(r.rows[0][col]) : null
  } catch {
    return null
  }
}

async function chatbotStatusDistribution(schema: string, table: string): Promise<Record<string, number>> {
  try {
    const r = await query(
      `SELECT status, COUNT(*) as count FROM "${schema}"."${table}" GROUP BY status ORDER BY status`
    )
    const dist: Record<string, number> = {}
    for (const row of r.rows) {
      dist[row.status] = Number(row.count)
    }
    return dist
  } catch {
    return {}
  }
}

// ── Feature queries map ────────────────────────────────────────────────────────

interface FeatureQuery {
  table: string
  statusCol?: string
  schema?: string
  tab?: string
}

const FEATURE_QUERIES: Record<string, FeatureQuery> = {
  products:     { table: 'products' },
  categories:   { table: 'categories' },
  customers:    { table: 'customers' },
  rfq:          { table: 'rfq_requests' },
  quotations:   { table: 'quotations' },
  leads:        { table: 'leads', schema: 'chatbot' },
  appointments: { table: 'appointments', schema: 'chatbot' },
  media:        { table: 'media' },
  pages:        { table: 'pages' },
  redirects:    { table: 'redirects' },
}

// ── Main aggregation ───────────────────────────────────────────────────────────

async function getTasksForFeature(slug: string): Promise<WorkflowTask[]> {
  try {
    const r = await query(
      `SELECT id, title, description, status, priority, assignee,
              due_date, metadata, sort_order, is_automated,
              completed_at, created_at, updated_at
       FROM workflow_tasks
       WHERE feature_slug = $1
       ORDER BY sort_order ASC, created_at DESC`,
      [slug]
    )
    return r.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignee: row.assignee,
      dueDate: row.due_date ? String(row.due_date) : null,
      metadata: typeof row.metadata === 'object' ? row.metadata : {},
      sortOrder: row.sort_order,
      isAutomated: row.is_automated,
      completedAt: row.completed_at ? String(row.completed_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }))
  } catch {
    return []
  }
}

function computeCompletion(tasks: WorkflowTask[]): number {
  if (tasks.length === 0) return 0
  const completed = tasks.filter(t => t.status === 'completed').length
  return Math.round((completed / tasks.length) * 100)
}

async function getFeatureDefinitions(): Promise<any[]> {
  try {
    const r = await query(
      `SELECT slug, title, icon, description, category, sort_order
       FROM workflow_features
       WHERE is_active = TRUE
       ORDER BY sort_order ASC`
    )
    return r.rows
  } catch {
    return []
  }
}

/**
 * Load complete workflow summary for all features.
 * Returns both aggregated data and inline auto-generated tasks.
 */
export async function loadWorkflowSummary(): Promise<WorkflowSummary> {
  const definitions = await getFeatureDefinitions()
  const features: FeatureWorkflow[] = []

  for (const def of definitions) {
    const slug = def.slug
    const fq = FEATURE_QUERIES[slug]

    let totalCount = 0
    let statusDist: Record<string, number> = {}
    let lastUpd: string | null = null

    if (fq) {
      const [count, dist, last] = await Promise.all([
        fq.schema
          ? chatbotStatusDistribution(fq.schema, fq.table)
          : Promise.resolve(undefined).then(() => countTable(fq.table)),
        fq.schema ? Promise.resolve({}) : statusDistribution(fq.table, fq.statusCol || 'status'),
        lastUpdated(fq.table),
      ])

      if (fq.schema) {
        statusDist = count as Record<string, number>
        totalCount = Object.values(statusDist).reduce((a, b) => a + b, 0)
        lastUpd = last
      } else {
        totalCount = count as number
        statusDist = dist
        lastUpd = last
      }
    }

    const tasks = await getTasksForFeature(slug)

    // Auto-generate a task if feature has data but no tasks defined
    if (tasks.length === 0 && totalCount > 0) {
      tasks.push({
        id: 0,
        title: `Review ${def.title.toLowerCase()} data`,
        description: `${totalCount} ${def.title.toLowerCase()} record(s) exist. Verify data quality and completeness.`,
        status: 'pending',
        priority: 'medium',
        assignee: null,
        dueDate: null,
        metadata: { count: totalCount },
        sortOrder: 0,
        isAutomated: true,
        completedAt: null,
        createdAt: '',
        updatedAt: '',
      })
    }

    features.push({
      slug,
      title: def.title,
      icon: def.icon || '📋',
      description: def.description || '',
      category: def.category || 'other',
      sortOrder: def.sort_order,
      totalCount,
      statusDistribution: statusDist,
      lastUpdated: lastUpd,
      tasks,
      completionPercent: computeCompletion(tasks),
    })
  }

  // Group by category
  const categories: Record<string, FeatureWorkflow[]> = {}
  for (const f of features) {
    if (!categories[f.category]) categories[f.category] = []
    categories[f.category].push(f)
  }

  const allTasks = features.flatMap(f => f.tasks)

  return {
    features,
    totalFeatures: features.length,
    activeTasks: allTasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length,
    completedTasks: allTasks.filter(t => t.status === 'completed').length,
    blockedTasks: allTasks.filter(t => t.status === 'blocked').length,
    categories,
  }
}

/**
 * Update a workflow task status
 */
export async function updateTaskStatus(
  taskId: number,
  status: string,
  performer: string
): Promise<boolean> {
  try {
    await query(
      `UPDATE workflow_tasks
       SET status = $1, updated_at = NOW(),
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $2`,
      [status, taskId]
    )
    // Log the audit entry
    await query(
      `INSERT INTO workflow_audit_log (feature_slug, task_id, action, new_status, performed_by)
       SELECT feature_slug, $1, 'status_changed', $2, $3
       FROM workflow_tasks WHERE id = $1`,
      [taskId, status, performer]
    )
    return true
  } catch {
    return false
  }
}

/**
 * Create a new workflow task
 */
export async function createTask(params: {
  featureSlug: string
  title: string
  description?: string
  priority?: string
  assignee?: string
}): Promise<number | null> {
  try {
    const r = await query(
      `INSERT INTO workflow_tasks (feature_slug, title, description, priority, assignee, metadata)
       VALUES ($1, $2, $3, $4, $5, '{}')
       RETURNING id`,
      [
        params.featureSlug,
        params.title,
        params.description || null,
        params.priority || 'medium',
        params.assignee || null,
      ]
    )
    // Log creation
    await query(
      `INSERT INTO workflow_audit_log (feature_slug, task_id, action, performed_by)
       VALUES ($1, $2, 'created', $3)`,
      [params.featureSlug, r.rows[0].id, params.assignee || 'system']
    )
    return r.rows[0].id
  } catch {
    return null
  }
}
