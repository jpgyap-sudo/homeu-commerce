import Link from 'next/link'

interface DNAProduct {
  id: number; title: string; slug: string; score: number; grade: string
  visuals: { score: number; max: number; detail: string }
  descriptive: { score: number; max: number; detail: string }
  commercial: { score: number; max: number; detail: string }
  seo: { score: number; max: number; detail: string }
  performance: { score: number; max: number; detail: string }
  fixes: string[]
}

interface Props {
  summary: { total: number; avg: number; grades: { S: number; A: number; B: number; C: number; D: number } }
  products: DNAProduct[]
}

const GRADE_COLORS: Record<string, string> = {
  S: 'linear-gradient(135deg, #c9a050, #e5c676)',
  A: '#059669',
  B: '#2563eb',
  C: '#d97706',
  D: '#e11d48',
}

function ScoreBar({ score, max, color = 'var(--luxe-gold-500)' }: { score: number; max: number; color?: string }) {
  const pct = Math.round((score / max) * 100)
  return (
    <div style={{ height: 4, borderRadius: 999, background: 'var(--luxe-warm-200)', marginTop: 4 }}>
      <div style={{ height: '100%', borderRadius: 999, background: color, width: `${pct}%`, transition: 'width 1s var(--ease-out)' }} />
    </div>
  )
}

export default function ProductDNACard({ summary, products }: Props) {
  const bottom = products.slice(0, 5)

  return (
    <div className="luxe-card" style={{ marginTop: 'var(--space-8)' }}>
      <div className="luxe-card-header">
        <h2 className="luxe-card-title">
          <span style={{ marginRight: 'var(--space-2)' }}>🧬</span>
          Product DNA Score
        </h2>
        <Link href="/admin/analytics/products" className="luxe-btn luxe-btn-ghost luxe-btn-sm">Full Report</Link>
      </div>

      {/* Summary bar */}
      <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--luxe-warm-100)', display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--luxe-navy-900)', lineHeight: 1 }}>{summary.avg}</div>
          <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Score / 100</div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 'var(--space-3)' }}>
          {(['S','A','B','C','D'] as const).map(g => (
            <div key={g} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: GRADE_COLORS[g].startsWith('linear') ? 'var(--luxe-gold-500)' : GRADE_COLORS[g] }}>{summary.grades[g]}</div>
              <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontWeight: 600, letterSpacing: '0.04em' }}>{g === 'S' ? 'Elite' : `Grade ${g}`}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--luxe-slate-400)' }}>{summary.total} products</div>
      </div>

      {/* Bottom products that need attention */}
      <div className="luxe-card-body" style={{ padding: 0 }}>
        <div style={{ padding: 'var(--space-4) var(--space-6)', fontSize: 12, fontWeight: 600, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ⚠️ Needs Attention — Lowest Scoring Products
        </div>
        {bottom.map(p => (
          <div key={p.id} style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--luxe-warm-100)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
            {/* Grade badge */}
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: GRADE_COLORS[p.grade],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 700,
              color: '#fff', flexShrink: 0,
            }}>
              {p.score}
            </div>

            {/* Product info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/admin/products/${p.id}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--luxe-navy-900)', textDecoration: 'none' }}>
                {p.title}
              </Link>
              <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', marginTop: 2 }}>{p.slug}</div>

              {/* Score bars */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                {[
                  { label: 'Visual', ...p.visuals, color: '#c9a050' },
                  { label: 'Desc', ...p.descriptive, color: '#059669' },
                  { label: 'Comm', ...p.commercial, color: '#2563eb' },
                  { label: 'SEO', ...p.seo, color: '#d97706' },
                  { label: 'Perf', ...p.performance, color: '#8b5cf6' },
                ].map(dim => (
                  <div key={dim.label} title={`${dim.label}: ${dim.score}/${dim.max}`}>
                    <div style={{ fontSize: 9, color: 'var(--luxe-slate-400)', marginBottom: 2 }}>{dim.label}</div>
                    <ScoreBar score={dim.score} max={dim.max} color={dim.color} />
                  </div>
                ))}
              </div>

              {/* Quick fixes */}
              {p.fixes.length > 0 && (
                <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                  {p.fixes.map(fix => (
                    <Link key={fix} href={`/admin/products/${p.id}`} style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 999,
                      background: 'var(--luxe-amber-bg)', color: 'var(--luxe-amber)',
                      fontWeight: 500, letterSpacing: '0.02em', textDecoration: 'none',
                    }}>
                      {fix}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {bottom.length === 0 && (
          <div className="luxe-empty">
            <div className="luxe-empty-icon">🧬</div>
            <p className="luxe-empty-title">All products scored</p>
            <p className="luxe-empty-desc">Every product has a complete DNA profile.</p>
          </div>
        )}
      </div>
    </div>
  )
}
