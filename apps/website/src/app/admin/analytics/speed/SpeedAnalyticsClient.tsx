'use client'

import { useState, useEffect } from 'react'

interface SpeedSummary {
  total_samples: number
  avg_lcp: number | null
  avg_fcp: number | null
  avg_ttfb: number | null
  avg_cls: string | null
  avg_load_time: number | null
  p50_load_time: number | null
  p90_load_time: number | null
}

interface Benchmark {
  target: number
  poor: number
  label: string
}

interface ByPathItem {
  path: string
  samples: number
  avg_load: number | null
}

export default function SpeedAnalyticsClient() {
  const [summary, setSummary] = useState<SpeedSummary | null>(null)
  const [byPath, setByPath] = useState<ByPathItem[]>([])
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark>>({})
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/performance?period=${period}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setSummary(d.summary || null)
        setByPath(d.byPath || [])
        setBenchmarks(d.benchmarks || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  function scoreRow(label: string, value: number | null, target: number, poor: number, unit = 'ms') {
    if (value === null) return { label, value: '—', color: '#667168', rating: 'No data' }
    const status = value <= target ? 'good' : value <= poor ? 'needs-work' : 'poor'
    const colors = { good: '#059669', 'needs-work': '#d97706', poor: '#e11d48' }
    return {
      label,
      value: value + unit,
      color: colors[status],
      rating: status === 'good' ? '✅ Good' : status === 'needs-work' ? '⚠️ Needs Work' : '❌ Poor',
    }
  }

  if (loading) {
    return (
      <div className="luxe-card" style={{ marginTop: 24 }}>
        <div className="luxe-card-body" style={{ textAlign: 'center', padding: 40, color: '#667168' }}>
          Loading performance data...
        </div>
      </div>
    )
  }

  const perfRows = [
    summary && scoreRow('LCP (Largest Contentful Paint)', summary.avg_lcp, benchmarks.lcp?.target || 2500, benchmarks.lcp?.poor || 4000),
    summary && scoreRow('FCP (First Contentful Paint)', summary.avg_fcp, benchmarks.fcp?.target || 1800, benchmarks.fcp?.poor || 3000),
    summary && scoreRow('TTFB (Time to First Byte)', summary.avg_ttfb, benchmarks.ttfb?.target || 800, benchmarks.ttfb?.poor || 1800),
    summary && scoreRow('Full Page Load', summary.avg_load_time, benchmarks.loadTime?.target || 3000, benchmarks.loadTime?.poor || 6000),
    summary && {
      label: 'CLS (Cumulative Layout Shift)',
      value: summary.avg_cls || '—',
      color: parseFloat(summary.avg_cls || '99') <= 0.1 ? '#059669' : parseFloat(summary.avg_cls || '99') <= 0.25 ? '#d97706' : '#e11d48',
      rating: !summary.avg_cls ? 'No data' : parseFloat(summary.avg_cls) <= 0.1 ? '✅ Good' : parseFloat(summary.avg_cls) <= 0.25 ? '⚠️ Needs Work' : '❌ Poor',
    },
  ].filter(Boolean)

  const industryAvg = [
    { label: 'Your Site', lcp: summary?.avg_lcp, load: summary?.avg_load_time, samples: summary?.total_samples || 0 },
    { label: 'Industry Avg (Desktop)', lcp: 3800, load: 4200, samples: 0 },
    { label: 'Top 10% Sites', lcp: 1500, load: 1500, samples: 0 },
    { label: 'Google Target', lcp: 2500, load: 3000, samples: 0 },
  ]

  return (
    <div style={{ marginTop: 24 }}>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#667168' }}>Period:</span>
        {['24h', '7d', '30d'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #d9e0d7',
              background: period === p ? '#151a17' : '#fff',
              color: period === p ? '#fff' : '#667168',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {p === '24h' ? 'Last 24 hours' : p === '7d' ? 'Last 7 days' : 'Last 30 days'}
          </button>
        ))}
        <span style={{ fontSize: 12, color: '#9aa69c', marginLeft: 'auto' }}>
          {summary?.total_samples || 0} samples collected
        </span>
      </div>

      {/* Core Web Vitals */}
      <div className="luxe-card" style={{ marginBottom: 24 }}>
        <div className="luxe-card-header">
          <h2 className="luxe-card-title">⚡ Core Web Vitals — Real User Data</h2>
        </div>
        <div className="luxe-card-body" style={{ padding: 0 }}>
          <table className="luxe-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Your Value</th>
                <th>Status</th>
                <th>Google Target</th>
              </tr>
            </thead>
            <tbody>
              {perfRows.map((row: any, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{row.label}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: row.color }}>
                    {row.value}
                  </td>
                  <td>
                    <span className={`luxe-badge ${row.rating.includes('Good') ? 'success' : row.rating.includes('Needs') ? 'warning' : 'danger'}`}>
                      {row.rating}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#667168' }}>
                    {row.label.includes('CLS') ? '< 0.1' : row.label.includes('LCP') ? '< 2.5s' : row.label.includes('FCP') ? '< 1.8s' : row.label.includes('TTFB') ? '< 800ms' : '< 3s'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary && (
            <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--luxe-warm-100)', display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 11, color: '#667168', fontWeight: 600 }}>P50 Load:</span>
                <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
                  {summary.p50_load_time ? summary.p50_load_time + 'ms' : '—'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#667168', fontWeight: 600 }}>P90 Load:</span>
                <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
                  {summary.p90_load_time ? summary.p90_load_time + 'ms' : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Benchmark Comparison */}
      <div className="luxe-card" style={{ marginBottom: 24 }}>
        <div className="luxe-card-header">
          <h2 className="luxe-card-title">📊 Benchmark Comparison</h2>
        </div>
        <div className="luxe-card-body">
          <table className="luxe-table">
            <thead>
              <tr>
                <th></th>
                <th style={{ textAlign: 'right' }}>LCP</th>
                <th style={{ textAlign: 'right' }}>Load Time</th>
                <th style={{ textAlign: 'right' }}>Samples</th>
              </tr>
            </thead>
            <tbody>
              {industryAvg.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: i === 0 ? 700 : 400, fontSize: 13 }}>{row.label}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: row.lcp && row.lcp > 2500 ? '#d97706' : '#059669' }}>
                    {row.lcp ? row.lcp + 'ms' : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: row.load && row.load > 3000 ? '#d97706' : '#059669' }}>
                    {row.load ? row.load + 'ms' : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12, color: '#667168' }}>
                    {row.samples || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-page breakdown */}
      {byPath.length > 0 && (
        <div className="luxe-card">
          <div className="luxe-card-header">
            <h2 className="luxe-card-title">📄 Per-Page Load Times</h2>
          </div>
          <div className="luxe-card-body" style={{ padding: 0 }}>
            <table className="luxe-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th style={{ textAlign: 'right' }}>Avg Load</th>
                  <th style={{ textAlign: 'right' }}>Samples</th>
                </tr>
              </thead>
              <tbody>
                {byPath.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#2563eb', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.path}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                      {item.avg_load ? item.avg_load + 'ms' : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: '#667168' }}>
                      {item.samples}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optimization tips */}
      <div className="luxe-card" style={{ marginTop: 24 }}>
        <div className="luxe-card-header">
          <h2 className="luxe-card-title">🚀 Speed Optimization Tips</h2>
        </div>
        <div className="luxe-card-body" style={{ padding: 'var(--space-4) var(--space-6)' }}>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, lineHeight: 2, color: '#4a524a' }}>
            <li><strong>Use next/image</strong> — Next.js auto-optimizes images to WebP and lazy-loads them</li>
            <li><strong>Reduce CSS</strong> — admin-legacy.css (23KB) + luxury-theme.css (28KB) could be purged of unused rules</li>
            <li><strong>Enable CDN caching</strong> — add Cache-Control headers for ISR pages on storefront</li>
            <li><strong>Preload hero images</strong> — add <code>{'<link rel="preload">'}</code> for above-fold images</li>
            <li><strong>Remove unused Shopify Debut theme CSS</strong> — storefront has ~800KB legacy theme CSS</li>
            <li><strong>Lazy-load below-fold content</strong> — defer non-critical sections on homepage</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
