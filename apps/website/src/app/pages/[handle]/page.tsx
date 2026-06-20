import { notFound } from 'next/navigation'
import { renderLexical } from '@/lib/renderLexical'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  const rows = await query(
    `SELECT title, seo_title, seo_description FROM pages WHERE slug = $1 LIMIT 1`,
    [handle]
  ).catch(() => ({ rows: [] }))
  const page = rows.rows[0]
  if (!page) return { title: 'Page Not Found' }
  return {
    title: page.seo_title || page.title,
    description: page.seo_description || undefined,
  }
}

export default async function PageRoute({ params }: Props) {
  const { handle } = await params

  const result = await query(
    `SELECT id, title, content, seo_title, seo_description, updated_at
     FROM pages WHERE slug = $1 LIMIT 1`,
    [handle]
  ).catch(() => ({ rows: [] }))

  const page = result.rows[0]
  if (!page) return notFound()

  const html = renderLexical(page.content)

  return (
    <main className="page-width" style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="section-header text-center" style={{ marginBottom: 32 }}>
        <h1>{page.title}</h1>
      </div>
      <div
        className="rte"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ lineHeight: 1.75, fontSize: 16 }}
      />
    </main>
  )
}
