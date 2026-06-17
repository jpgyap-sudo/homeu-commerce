import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { query } from '@/lib/db'
import ArticleEditor, { type ArticleData } from '../ArticleEditor'

export const metadata = { title: 'Edit article — DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const { id } = await params

  const [aRes, blogsRes] = await Promise.all([
    query('SELECT * FROM articles WHERE id = $1', [id]),
    query('SELECT id, title, handle FROM blogs ORDER BY title ASC', []),
  ])
  if (aRes.rows.length === 0) notFound()
  const a = aRes.rows[0]

  const initial: ArticleData = {
    id: a.id,
    blogId: a.blog_id ?? '',
    title: a.title || '',
    handle: a.handle || '',
    body: a.body || '',
    authorName: a.author_name || '',
    publishedAt: a.published_at ? new Date(a.published_at).toISOString().slice(0, 10) : '',
    imageUrl: a.image_url || '',
    imageAlt: a.image_alt || '',
    tags: Array.isArray(a.tags) ? a.tags : [],
    blogHandle: a.blog_handle || '',
  }
  return <ArticleEditor initial={initial} blogs={blogsRes.rows} />
}
