import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.homeu.ph'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300)
}

export async function GET() {
  try {
    const result = await query(
      `SELECT a.title, a.handle, a.body, a.published_at, a.image_url, a.author_name,
              b.handle as blog_handle, b.title as blog_title
       FROM articles a JOIN blogs b ON b.id = a.blog_id
       ORDER BY a.published_at DESC NULLS LAST
       LIMIT 20`,
      []
    )

    const items = result.rows.map((a: any) => {
      const url = `${BASE}/blog/${a.blog_handle}/${a.handle}`
      const excerpt = a.body ? stripHtml(a.body) : ''
      const pubDate = a.published_at ? new Date(a.published_at).toUTCString() : new Date().toUTCString()
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(excerpt)}</description>
      <category>${escapeXml(a.blog_title)}</category>
      ${a.author_name ? `<author>${escapeXml(a.author_name)}</author>` : ''}
      <pubDate>${pubDate}</pubDate>
      ${a.image_url ? `<enclosure url="${escapeXml(a.image_url)}" type="image/jpeg" length="0"/>` : ''}
    </item>`
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Home Atelier Journal</title>
    <link>${BASE}/blog</link>
    <description>Design trends, material guides, and interior inspiration from Home Atelier</description>
    <language>en-ph</language>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[feed.xml] error:', err)
    return new NextResponse('Feed unavailable', { status: 500 })
  }
}
