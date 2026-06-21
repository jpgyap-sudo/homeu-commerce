import { query } from '@/lib/db'
import { renderLexical } from '@/lib/renderLexical'
import DesignerClubForm from './DesignerClubForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const result = await query(
    `SELECT title, seo_title, seo_description FROM pages WHERE slug = 'designerclub' LIMIT 1`
  ).catch(() => ({ rows: [] }))
  const page = result.rows[0]
  return {
    title: page?.seo_title || page?.title || 'Designer Club',
    description: page?.seo_description || 'Join the Home Atelier Designer Club — exclusive trade benefits for interior designers and architects.',
  }
}

export default async function DesignerClubPage() {
  const result = await query(
    `SELECT title, content FROM pages WHERE slug = 'designerclub' LIMIT 1`
  ).catch(() => ({ rows: [] }))
  const page = result.rows[0]
  const html = page?.content ? renderLexical(page.content) : ''

  return (
    <main className="page-width" style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto' }}>
      {html && (
        <div
          className="rte"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ marginBottom: 40 }}
        />
      )}
      <DesignerClubForm />
    </main>
  )
}
