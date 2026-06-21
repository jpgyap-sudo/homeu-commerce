/**
 * POST /api/analytics/performance — record real-user performance metrics.
 *
 * Called from the client-side WebVitalsTracker component.
 * Captures Core Web Vitals + load time from real users.
 *
 * Body: { path, lcp, fcp, ttfb, cls, loadTime, deviceType }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, lcp, fcp, ttfb, cls, loadTime, deviceType } = body

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    await query(
      `INSERT INTO performance_metrics (path, lcp, fcp, ttfb, cls, load_time, device_type, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        String(path).slice(0, 500),
        lcp ? Math.round(Number(lcp)) : null,      // Largest Contentful Paint (ms)
        fcp ? Math.round(Number(fcp)) : null,       // First Contentful Paint (ms)
        ttfb ? Math.round(Number(ttfb)) : null,     // Time to First Byte (ms)
        cls ? Number(cls).toFixed(3) : null,        // Cumulative Layout Shift
        loadTime ? Math.round(Number(loadTime)) : null, // Full page load (ms)
        String(deviceType || 'desktop').slice(0, 20),
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[performance] Error recording metric:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/analytics/performance?period=7d — aggregate performance stats.
 */
export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get('period') || '7d'
    const interval = period === '30d' ? "NOW() - INTERVAL '30 days'" : period === '24h' ? "NOW() - INTERVAL '24 hours'" : "NOW() - INTERVAL '7 days'"

    const [avg, byPath, recent] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int AS total_samples,
          ROUND(AVG(lcp))::int AS avg_lcp,
          ROUND(AVG(fcp))::int AS avg_fcp,
          ROUND(AVG(ttfb))::int AS avg_ttfb,
          ROUND(AVG(cls)::numeric, 3)::text AS avg_cls,
          ROUND(AVG(load_time))::int AS avg_load_time,
          ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY load_time))::int AS p50_load_time,
          ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY load_time))::int AS p90_load_time
        FROM performance_metrics
        WHERE recorded_at >= ${interval}
      `),
      query(`
        SELECT path, COUNT(*)::int AS samples, ROUND(AVG(load_time))::int AS avg_load
        FROM performance_metrics
        WHERE recorded_at >= ${interval}
        GROUP BY path ORDER BY samples DESC LIMIT 10
      `),
      query(`
        SELECT path, load_time, device_type, recorded_at
        FROM performance_metrics
        WHERE recorded_at >= ${interval}
        ORDER BY recorded_at DESC LIMIT 50
      `),
    ])

    const benchmarks = {
      lcp: { target: 2500, poor: 4000, label: 'LCP (Largest Contentful Paint)' },
      fcp: { target: 1800, poor: 3000, label: 'FCP (First Contentful Paint)' },
      ttfb: { target: 800, poor: 1800, label: 'TTFB (Time to First Byte)' },
      cls: { target: 0.1, poor: 0.25, label: 'CLS (Cumulative Layout Shift)' },
      loadTime: { target: 3000, poor: 6000, label: 'Full Page Load' },
    }

    return NextResponse.json({
      summary: avg.rows[0] || {},
      byPath: byPath.rows,
      recent: recent.rows,
      benchmarks,
      period,
      sampleCount: avg.rows[0]?.total_samples || 0,
    })
  } catch (error: any) {
    console.error('[performance] GET error:', error)
    return NextResponse.json({ summary: {}, byPath: [], recent: [], benchmarks: {}, period: '7d', sampleCount: 0 })
  }
}
