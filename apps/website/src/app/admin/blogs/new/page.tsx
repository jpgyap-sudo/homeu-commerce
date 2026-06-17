import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import ArticleEditor, { type ArticleData } from '../ArticleEditor'

export const metadata = { title: 'New article — DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function NewArticlePage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const blogsRes = await query('SELECT id, title, handle FROM blogs ORDER BY title ASC', []).catch(() => ({ rows: [] }))
  const today = new Date().toISOString().slice(0, 10)

  const initial: ArticleData = {
    blogId: blogsRes.rows[0]?.id ?? '', title: '', handle: '', body: '',
    authorName: '', publishedAt: today, imageUrl: '', imageAlt: '', tags: [],
  }
  return <ArticleEditor initial={initial} blogs={blogsRes.rows} />
}
