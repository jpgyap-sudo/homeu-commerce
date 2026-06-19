/**
 * GET /api/health/live — liveness probe (lightweight)
 *
 * Returns 200 immediately if the process is alive. No DB check.
 * Used by Docker healthcheck and Kubernetes liveness probe.
 *
 * Expected by: docker-compose.yml healthcheck
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
