# DaVinciOS Workflow Management Skill

## Overview

The Workflow Management system provides a centralized dashboard in the DaVinciOS admin panel at `/admin/workflows` for monitoring operational workflow status across all website features. It uses a **Smart Widget** pattern where each feature has a collapsible card showing real-time data counts, status distribution, and actionable tasks.

## Architecture

```
apps/website/src/
├── app/admin/workflows/
│   ├── page.tsx                    # Server component — auth guard + data load
│   └── WorkflowsDashboard.tsx      # Client component — filtering + layout
├── app/api/admin/workflows/
│   └── tasks/route.ts              # PATCH endpoint for task status updates
├── components/admin/
│   ├── SmartWidget.tsx             # Collapsible smart widget card (client)
│   ├── StatusBadge.tsx             # Reusable status label component
│   └── index.ts                    # Barrel exports
├── lib/
│   ├── workflows.ts                # Data layer — aggregation + task CRUD
│   └── db.ts                       # PostgreSQL query helpers
tools/migration-brain/
└── migrations/
    └── 003-workflows.sql           # Database schema migration
```

## Database Schema

### `workflow_features`
Defines each tracked feature (products, categories, etc.):
- `slug` (unique) — feature identifier
- `title`, `icon`, `description` — display info
- `category` — grouping bucket: catalog, sales, engagement, content, system
- `sort_order`, `is_active`

### `workflow_tasks`
Action items for each feature:
- `feature_slug` — FK to workflow_features
- `title`, `description` — task details
- `status` — pending | in_progress | completed | blocked | skipped
- `priority` — low | medium | high | critical
- `assignee`, `due_date`, `metadata` (JSONB)
- `is_automated` — true for auto-generated tasks
- `completed_at`, `created_at`, `updated_at`

### `workflow_audit_log`
Change tracking for all workflow mutations.

## Smart Widget Component

The `SmartWidget` component (`components/admin/SmartWidget.tsx`) is a reusable collapsible card that displays:

1. **Header**: Feature icon, title, category badge, record count, completion progress ring
2. **Expanded Content** (toggled by click):
   - Summary row (total count, last updated, task count, blocked count)
   - Status distribution bar (colored proportional bar for data statuses)
   - Task list with inline status controls (dropdown to change status)
   - Each task shows priority color indicator, assignee, due date

## Key Files

| File | Purpose |
|------|---------|
| `lib/workflows.ts` | Data aggregation — `loadWorkflowSummary()` queries each feature table + workflow_tasks |
| `components/admin/SmartWidget.tsx` | Client component — renders feature card with collapsible task management |
| `app/admin/workflows/WorkflowsDashboard.tsx` | Client component — search, filter, category grouping |
| `app/admin/workflows/page.tsx` | Server entry — session guard, data loading |
| `app/api/admin/workflows/tasks/route.ts` | PATCH API — update task status with audit logging |

## Adding a New Feature

1. Add seed data to `003-workflows.sql` or run INSERT into `workflow_features`
2. Add a feature query config in `lib/workflows.ts` `FEATURE_QUERIES` map
3. The feature will appear in the Workflows dashboard automatically

## Common Operations

### Manually create a task
```sql
INSERT INTO workflow_tasks (feature_slug, title, description, priority, assignee)
VALUES ('products', 'Review pending products', '5 products need price verification', 'high', 'staff@homeu.ph');
```

### Query all blocked tasks
```sql
SELECT wt.*, wf.title as feature
FROM workflow_tasks wt
JOIN workflow_features wf ON wf.slug = wt.feature_slug
WHERE wt.status = 'blocked'
ORDER BY wt.priority DESC, wt.due_date ASC;
```

## Migration

Run the schema migration against the database:
```bash
psql -h localhost -U homeu -d homeu -f tools/migration-brain/migrations/003-workflows.sql
```
