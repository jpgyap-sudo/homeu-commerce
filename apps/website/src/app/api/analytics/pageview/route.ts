import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * POST /api/analytics/pageview — record a page view with source attribution.
 *
 * Called from the client-side PageViewTracker component.
 * Body: { path, title?, referrer?, visitorId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, title, referrer, visitorId } = body

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    // Truncate fields to prevent abuse
    const safePath = String(path).slice(0, 500)
    const safeTitle = title ? String(title).slice(0, 300) : null
    const safeReferrer = referrer ? String(referrer).slice(0, 1000) : null
    const safeVisitor = visitorId ? String(visitorId).slice(0, 100) : null

    // ── Source Attribution ─────────────────────────────────────────
    const { source, category } = classifySource(safeReferrer)

    await query(
      `INSERT INTO page_views (path, title, referrer, visitor_id, is_admin, source, source_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [safePath, safeTitle, safeReferrer, safeVisitor, safePath.startsWith('/admin'), source, category]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[pageview] Error recording:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/** Classify a referrer URL into source + category. */
function classifySource(referrer: string | null): { source: string; category: string } {
  if (!referrer) return { source: 'direct', category: 'Direct' }

  const r = referrer.toLowerCase()

  // Search engines
  if (r.includes('google.com'))       return { source: 'google', category: 'Search Engine' }
  if (r.includes('bing.com'))         return { source: 'bing', category: 'Search Engine' }
  if (r.includes('yahoo.com'))        return { source: 'yahoo', category: 'Search Engine' }
  if (r.includes('duckduckgo.com'))   return { source: 'duckduckgo', category: 'Search Engine' }
  if (r.includes('yandex'))           return { source: 'yandex', category: 'Search Engine' }

  // AI search / assistants
  if (r.includes('chatgpt.com') || r.includes('chat.openai.com'))
    return { source: 'chatgpt', category: 'AI Search' }
  if (r.includes('perplexity.ai'))    return { source: 'perplexity', category: 'AI Search' }
  if (r.includes('claude.ai'))        return { source: 'claude', category: 'AI Search' }
  if (r.includes('bard.google.com') || r.includes('gemini.google.com'))
    return { source: 'gemini', category: 'AI Search' }
  if (r.includes('copilot.microsoft.com'))
    return { source: 'copilot', category: 'AI Search' }

  // Social media
  if (r.includes('facebook.com') || r.includes('fb.com'))
    return { source: 'facebook', category: 'Social Media' }
  if (r.includes('instagram.com'))    return { source: 'instagram', category: 'Social Media' }
  if (r.includes('twitter.com') || r.includes('x.com'))
    return { source: 'twitter', category: 'Social Media' }
  if (r.includes('linkedin.com'))     return { source: 'linkedin', category: 'Social Media' }
  if (r.includes('pinterest.com') || r.includes('pin.it'))
    return { source: 'pinterest', category: 'Social Media' }
  if (r.includes('tiktok.com'))       return { source: 'tiktok', category: 'Social Media' }
  if (r.includes('reddit.com'))       return { source: 'reddit', category: 'Social Media' }
  if (r.includes('youtube.com') || r.includes('youtu.be'))
    return { source: 'youtube', category: 'Social Media' }

  // Messaging apps
  if (r.includes('telegram.org') || r.includes('t.me'))
    return { source: 'telegram', category: 'Messaging' }
  if (r.includes('whatsapp.com') || r.includes('wa.me'))
    return { source: 'whatsapp', category: 'Messaging' }
  if (r.includes('viber.com'))        return { source: 'viber', category: 'Messaging' }

  // Email
  if (r.includes('mail.google.com') || r.includes('outlook.live.com') || r.includes('mail.yahoo.com'))
    return { source: 'email', category: 'Email' }

  // Own domains (internal navigation)
  if (r.includes('homeatelier.ph') || r.includes('homeu.ph'))
    return { source: 'internal', category: 'Internal' }

  // Other referring sites
  return { source: 'referral', category: 'Referral' }
}
