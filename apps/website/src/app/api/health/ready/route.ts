/**
 * GET /api/health/ready — readiness probe
 *
 * Returns 200 when the app can serve traffic (DB reachable + env valid).
 * Used by Kubernetes readiness probe and load balancer health checks.
 */
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getEnvResult } from '@/lib/env-validator'

export async function GET() {
  const checks: Record<string, string> = {}

  // DB reachable?
  try {
    await query('SELECT 1', [])
    checks.database = 'ok'
  } catch {
    checks.database = 'unreachable'
  }

  // Env valid?
  const envResult = getEnvResult()
  checks.env = envResult?.ok ? 'ok' : 'invalid'

  const ok = checks.database === 'ok' && checks.env === 'ok'
  return NextResponse.json(
    { status: ok ? 'ready' : 'not_ready', checks },
    { status: ok ? 200 : 503 }
  )
}
