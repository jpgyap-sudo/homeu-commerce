'use client'

import { useState } from 'react'
import type { FeatureWorkflow, WorkflowTask } from '@/lib/workflows'
import StatusBadge from './StatusBadge'

// Re-export for convenience
export type WidgetFeature = FeatureWorkflow
export type WidgetTask = WorkflowTask

interface SmartWidgetProps {
  feature: FeatureWorkflow
  variant?: 'compact' | 'expanded'
  onTaskUpdate?: (taskId: number, newStatus: string) => void
}

// ── Priority colors ────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#e74b16',
  high:     '#b85a2a',
  medium:   '#d4a017',
  low:      '#667168',
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: '🔴 Critical',
  high:     '🟠 High',
  medium:   '🟡 Medium',
  low:      '⚪ Low',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function CategoryLabel({ category }: { category: string }) {
  const labels: Record<string, string> = {
    catalog:    '📦 Catalog',
    sales:      '💰 Sales',
    engagement: '🎯 Engagement',
    content:    '📝 Content',
    system:     '⚙️ System',
  }
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {labels[category] || category}
    </span>
  )
}

// ── Status Distribution Bar ────────────────────────────────────────────────────

function StatusBar({ distribution }: { distribution: Record<string, number> }) {
  const entries = Object.entries(distribution)
  if (entries.length === 0) return null

  const total = entries.reduce((a, [, c]) => a + c, 0)
  if (total === 0) return null

  const barColors: Record<string, string> = {
    new: '#1a5bb5',
    contacted: '#d4a017',
    quoted: '#1a6d3e',
    qualified: '#2d8f5e',
    closed: '#667168',
    won: '#1a6d3e',
    lost: '#b85a2a',
    spam: '#a09c96',
    active: '#1a6d3e',
    draft: '#a09c96',
    archived: '#667168',
    pending: '#a09c96',
    in_progress: '#1a5bb5',
    completed: '#1a6d3e',
    blocked: '#e74b16',
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', height: 6, background: '#e3e0d9' }}>
        {entries.map(([status, count]) => {
          const pct = (count / total) * 100
          if (pct < 1) return null
          return (
            <div
              key={status}
              style={{
                width: `${pct}%`,
                background: barColors[status] || '#a09c96',
                minWidth: 4,
              }}
              title={`${status}: ${count}`}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
        {entries.map(([status, count]) => (
          <span key={status} style={{ fontSize: 11, color: '#667168', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{
              width: 8, height: 8, borderRadius: 2,
              background: barColors[status] || '#a09c96', display: 'inline-block',
            }} />
            {status}: {count}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SmartWidget({ feature, variant = 'compact', onTaskUpdate }: SmartWidgetProps) {
  const [tasks, setTasks] = useState(feature.tasks)
  const [collapsed, setCollapsed] = useState(variant === 'compact')
  const [updating, setUpdating] = useState<number | null>(null)

  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const blockedCount = tasks.filter(t => t.status === 'blocked').length

  async function handleStatusChange(taskId: number, newStatus: string) {
    setUpdating(taskId)
    try {
      const res = await fetch('/api/admin/workflows/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
        onTaskUpdate?.(taskId, newStatus)
      }
    } finally {
      setUpdating(null)
    }
  }

  const statusEntries = Object.entries(feature.statusDistribution)

  // Compute which data statuses to show inline
  const showDataStatus = statusEntries.length > 0 && feature.totalCount > 0

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e3e0d9',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(20,19,18,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '14px 18px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{feature.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1917' }}>
              {feature.title}
            </span>
            <CategoryLabel category={feature.category} />
          </div>
          {feature.description && (
            <div style={{ fontSize: 12, color: '#7d7a75', marginTop: 2, lineHeight: 1.4 }}>
              {feature.description}
            </div>
          )}
        </div>

        {/* Progress ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1917' }}>
              {feature.totalCount}
            </div>
            <div style={{ fontSize: 10, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Records
            </div>
          </div>
          {feature.tasks.length > 0 && (
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: feature.completionPercent === 100 ? '#1a6d3e' : '#1a1917',
              background: `conic-gradient(#1a6d3e ${feature.completionPercent}%, #e3e0d9 ${feature.completionPercent}%)`,
              position: 'relative',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {feature.completionPercent}%
              </div>
            </div>
          )}
          <span style={{ color: '#a09c96', fontSize: 14, transition: 'transform 0.2s', transform: collapsed ? 'rotate(0)' : 'rotate(180deg)' }}>
            ▼
          </span>
        </div>
      </button>

      {/* ── Expanded Content ─────────────────────────────────── */}
      {!collapsed && (
        <div style={{ borderTop: '1px solid #e3e0d9' }}>
          {/* Summary row */}
          <div style={{
            display: 'flex', gap: 16, padding: '12px 18px',
            background: '#faf9f6', borderBottom: '1px solid #e3e0d9',
            fontSize: 12, color: '#667168',
          }}>
            <span>📊 {feature.totalCount} total</span>
            {feature.lastUpdated && <span>🕐 Updated {formatDate(feature.lastUpdated)}</span>}
            <span>📋 {tasks.length} task(s)</span>
            {blockedCount > 0 && <span style={{ color: '#e74b16' }}>🚫 {blockedCount} blocked</span>}
          </div>

          {/* Status distribution bar */}
          {showDataStatus && <div style={{ padding: '8px 18px' }}><StatusBar distribution={feature.statusDistribution} /></div>}

          {/* Tasks list */}
          {tasks.length > 0 ? (
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '0 18px 6px', fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Workflow Tasks
              </div>
              {tasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 18px',
                    borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || '#667168'}`,
                    margin: '0 8px 4px',
                    borderRadius: '0 6px 6px 0',
                    background: task.status === 'completed' ? '#faf9f6' : 'transparent',
                    opacity: task.status === 'completed' ? 0.7 : 1,
                  }}
                >
                  {/* Status control */}
                  <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    {task.status === 'completed' ? (
                      <span style={{ fontSize: 16 }}>✅</span>
                    ) : (
                      <select
                        value={task.status}
                        disabled={updating === task.id}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                        style={{
                          fontSize: 11, padding: '2px 4px', borderRadius: 4,
                          border: '1px solid #d9e0d7', background: '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="in_progress">🔄 In Progress</option>
                        <option value="completed">✅ Completed</option>
                        <option value="blocked">🚫 Blocked</option>
                        <option value="skipped">⏭️ Skipped</option>
                      </select>
                    )}
                  </div>

                  {/* Task content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 13, fontWeight: 500, color: task.status === 'completed' ? '#7d7a75' : '#1a1917',
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      }}>
                        {task.title}
                      </span>
                      {task.isAutomated && (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#e8f0fe', color: '#1a5bb5', fontWeight: 600 }}>
                          AUTO
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: 11, color: '#7d7a75', marginTop: 2, lineHeight: 1.4 }}>
                        {task.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {task.assignee && (
                        <span style={{ fontSize: 10, color: '#667168' }}>👤 {task.assignee}</span>
                      )}
                      {task.dueDate && (
                        <span style={{ fontSize: 10, color: '#667168' }}>📅 {formatDate(task.dueDate)}</span>
                      )}
                      {task.completedAt && (
                        <span style={{ fontSize: 10, color: '#1a6d3e' }}>✅ {formatDate(task.completedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 13, color: '#a09c96' }}>
              No workflow tasks defined. <a href={`/admin/workflows?feature=${feature.slug}`} style={{ color: '#1a6d3e' }}>Create one</a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
