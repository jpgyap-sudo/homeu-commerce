/**
 * Next.js instrumentation hook — runs once when the server process boots.
 * Disabled in dev mode — webpack cannot compile Node.js native 'pg' module.
 * Only runs in production where it's loaded at runtime, not build time.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
}
