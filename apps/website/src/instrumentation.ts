/**
 * Next.js instrumentation hook — runs once when the server process boots.
 * Used here to schedule the daily RFQ cleanup sweep (expired attachments +
 * unanswered-RFQ archiving) in-process, since this app runs as a single
 * long-lived Docker container rather than serverless functions, and there
 * is no external scheduler wired up to call /api/cron/rfq-cleanup-sweep.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  const { runRfqCleanupSweep } = await import('@/lib/rfq-cleanup-sweep')

  async function sweep() {
    try {
      const result = await runRfqCleanupSweep()
      if (result.attachmentsDeleted > 0 || result.rfqsArchived > 0) {
        console.log('[rfq-cleanup-sweep]', result)
      }
    } catch (err) {
      console.error('[rfq-cleanup-sweep] failed:', err instanceof Error ? err.message : err)
    }
  }

  // Run once shortly after boot, then every 24h.
  setTimeout(sweep, 60_000)
  setInterval(sweep, ONE_DAY_MS)
}
