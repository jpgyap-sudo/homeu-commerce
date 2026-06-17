'use client'

import { useState, useMemo } from 'react'
import SmartWidget from '@/components/admin/SmartWidget'
import StatusBadge from '@/components/admin/StatusBadge'
import type { WorkflowSummary } from '@/lib/workflows'

// ── Props ──────────────────────────────────────────────────────────────────────

interface DashboardProps {
  summary: WorkflowSummary
  sessionName: string
}

// ── Category Display Config ────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; desc: string }> = {
  catalog:    { label: 'Catalog & Inventory',    icon: '📦', desc: 'Product data, categories, and inventory management' },
  sales:      { label: 'Sales & Revenue',        icon: '💰', desc: 'Customer relationships, quotes, and RFQ lifecycle' },
  engagement: { label: 'Engagement & Leads',     icon: '🎯', desc: 'Chatbot, lead scoring, and appointment scheduling' },
  content:    { label: 'Content & Media',        icon: '📝', desc: 'CMS pages, media library, and SEO content' },
  system:     { label: 'System & Configuration', icon: '⚙️', desc: 'Redirects, analytics, and platform settings' },
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorkflowsDashboard({ summary, sessionName }: DashboardProps) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [compactView, setCompactView] = useState(true)

  // ── Filtering ──────────────────────────────────────────────

  const filteredFeatures = useMemo(() => {
    let features = summary.features

    if (search.trim()) {
      const q = search.toLowerCase()
      features = features.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q)
      )
    }

    if (filterCategory !== 'all') {
      features = features.filter(f => f.category === filterCategory)
    }

    if (filterStatus === 'needs_attention') {
      features = features.filter(f => f.tasks.some(t => t.status === 'blocked' || t.status === 'pending'))
    } else if (filterStatus === 'complete') {
      features = features.filter(f => f.completionPercent === 100 && f.tasks.length > 0)
    } else if (filterStatus === 'in_progress') {
      features = features.filter(f => f.completionPercent > 0 && f.completionPercent < 100)
    }

    return features
  }, [search, filterCategory, filterStatus, summary.features])

  // ── Group by category ──────────────────────────────────────

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, typeof summary.features> = {}
    for (const f of filteredFeatures) {
      const cat = f.category || 'other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(f)
    }
    return groups
  }, [filteredFeatures])

  // ── Stats ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    const allTasks = summary.features.flatMap(f => f.tasks)
    return {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      blocked: allTasks.filter(t => t.status === 'blocked').length,
    }
  }, [summary])

  return (
    <div className="admin-workflows">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="wf-header">
        <div>
          <h1>Workflows</h1>
          <p>
            Monitor operational workflow status across all DaVinciOS features.
            <span style={{ color: '#667168', marginLeft: 8 }}>— {sessionName}</span>
          </p>
        </div>
        <div className="wf-header-actions">
          <span style={{ fontSize: 12, color: '#667168' }}>
            {summary.features.length} features · {stats.total} tasks
          </span>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <div className="wf-stats-bar">
        <div className="wf-stat-card wf-stat-total">
          <div className="wf-stat-value">{summary.features.length}</div>
          <div className="wf-stat-label">Features</div>
        </div>
        <div className="wf-stat-card wf-stat-completed">
          <div className="wf-stat-value">{stats.completed}</div>
          <div className="wf-stat-label">Completed</div>
        </div>
        <div className="wf-stat-card wf-stat-active">
          <div className="wf-stat-value">{stats.inProgress + stats.pending}</div>
          <div className="wf-stat-label">Active Tasks</div>
        </div>
        {stats.blocked > 0 && (
          <div className="wf-stat-card wf-stat-blocked">
            <div className="wf-stat-value">{stats.blocked}</div>
            <div className="wf-stat-label">Blocked</div>
          </div>
        )}
        <div className="wf-stat-card wf-stat-rate">
          <div className="wf-stat-value">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </div>
          <div className="wf-stat-label">Complete</div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="wf-filters">
        <div className="wf-search-wrap">
          <span className="wf-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search features..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="wf-search-input"
          />
          {search && (
            <button className="wf-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="wf-filter-select"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="wf-filter-select"
        >
          <option value="all">All Status</option>
          <option value="needs_attention">Needs Attention</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
        </select>

        <button
          onClick={() => setCompactView(!compactView)}
          className="wf-toggle-btn"
          title={compactView ? 'Expand all widgets' : 'Compact view'}
        >
          {compactView ? '🔽 Expand All' : '🔼 Compact'}
        </button>
      </div>

      {/* ── Feature Grid by Category ─────────────────────────── */}
      {Object.entries(groupedFeatures).length === 0 ? (
        <div className="wf-empty">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <h3>No matching features</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => {
          const features = groupedFeatures[catKey]
          if (!features || features.length === 0) return null

          return (
            <section key={catKey} className="wf-category-section">
              <div className="wf-category-header">
                <div>
                  <h2>{config.icon} {config.label}</h2>
                  <p>{config.desc}</p>
                </div>
                <span className="wf-category-count">{features.length} feature{features.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="wf-feature-grid">
                {features.map(feature => (
                  <SmartWidget
                    key={feature.slug}
                    feature={feature}
                    variant={compactView ? 'compact' : 'expanded'}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="wf-legend">
        <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', marginBottom: 8 }}>
          Priority Legend
        </div>
        <div className="wf-legend-items">
          <span className="wf-legend-item"><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e74b16', display: 'inline-block' }} /> Critical</span>
          <span className="wf-legend-item"><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#b85a2a', display: 'inline-block' }} /> High</span>
          <span className="wf-legend-item"><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d4a017', display: 'inline-block' }} /> Medium</span>
          <span className="wf-legend-item"><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#667168', display: 'inline-block' }} /> Low</span>
        </div>
      </div>
    </div>
  )
}
