/**
 * GET /api/health — full system healthcheck
 *
 * Returns status for database, optional services (Ollama, DO Spaces),
 * and environment validation. Used by monitoring tools and dashboards.
 *
 * GET /api/health          → full check
 * GET /api/health?quick=1  → DB + env only (fast)
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getEnvResult } from '@/lib/env-validator'

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  uptime_seconds: number
  checks: Record<string, { status: string; latency_ms?: number }>
}

export async function GET(request: NextRequest) {
  const quick = request.nextUrl.searchParams.get('quick') === '1'
  const start = Date.now()
  const checks: HealthCheck['checks'] = {}

  // Database ping
  try {
    const dbStart = Date.now()
    await query('SELECT 1', [])
    checks.database = { status: 'ok', latency_ms: Date.now() - dbStart }
  } catch (err: any) {
    checks.database = { status: 'down', latency_ms: Date.now() - start }
  }

  // Environment validation
  const envResult = getEnvResult()
  checks.env = { status: envResult?.ok ? 'ok' : 'degraded' }

  // Optional service checks (skip for quick mode)
  if (!quick) {
    // Ollama ping (if configured)
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434'
    try {
      const ollamaStart = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(`${ollamaHost}/api/tags`, { signal: controller.signal })
      clearTimeout(timeout)
      checks.ollama = { status: res.ok ? 'ok' : 'degraded', latency_ms: Date.now() - ollamaStart }
    } catch {
      checks.ollama = { status: process.env.AI_PROVIDER === 'ollama' ? 'degraded' : 'disabled' }
    }

    // DO Spaces ping (if configured)
    if (process.env.DO_SPACES_ENDPOINT && process.env.DO_SPACES_BUCKET) {
      try {
        const doStart = Date.now()
        const res = await fetch(`https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}`, { method: 'HEAD' })
        checks.do_spaces = { status: res.ok || res.status === 403 ? 'ok' : 'degraded', latency_ms: Date.now() - doStart }
      } catch {
        checks.do_spaces = { status: 'degraded' }
      }
    }
  }

  // Overall status
  const statuses = Object.values(checks).map(c => c.status)
  const overall: HealthCheck['status'] =
    statuses.every(s => s === 'ok') ? 'ok' :
    statuses.every(s => s === 'down') ? 'down' : 'degraded'

  return NextResponse.json({
    status: overall,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    checks,
  })
}
