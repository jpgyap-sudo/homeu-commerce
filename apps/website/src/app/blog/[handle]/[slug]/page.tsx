import { notFound } from 'next/navigation'
import Link from 'next/link'
import { query } from '@/lib/db'

interface Article {
  id: number
  title: string
  handle: string
  body: string | null
  author_name: string | null
  published_at: string | null
  blog_id: number
  blog_title: string
  blog_handle: string
}

async function getArticle(handle: string, slug: string): Promise<Article | null> {
  try {
    const res = await query(
      `SELECT a.*, b.title as blog_title, b.handle as blog_handle
       FROM articles a JOIN blogs b ON b.id = a.blog_id
       WHERE b.handle = $1 AND a.handle = $2 LIMIT 1`,
      [handle, slug]
    )
    return res.rows[0] || null
  } catch { return null }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>
}) {
  const { handle, slug } = await params
  const article = await getArticle(handle, slug)
  if (!article) return { title: 'Article not found' }
  return { title: article.title }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>
}) {
  const { handle, slug } = await params
  const article = await getArticle(handle, slug)
  if (!article) notFound()

  const backHref = handle === 'design-trends' ? '/pages/design-trends' : `/blog/${handle}`
  const backLabel = handle === 'design-trends' ? 'Interior Design Ideas' : article.blog_title

  return (
    <article className="page-width" aria-labelledby="article-title">
      <div className="grid">
        <div className="grid__item medium-up--five-sixths medium-up--push-one-twelfth">
          <div className="section-header text-center">
            <h1 className="article__title" id="article-title">{article.title}</h1>
            {article.author_name && <span className="article__author">by {article.author_name}</span>}
            {article.published_at && (
              <span className="article__date">
                <time dateTime={article.published_at}>
                  {new Date(article.published_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
              </span>
            )}
          </div>

          {article.body ? (
            <div className="rte" dangerouslySetInnerHTML={{ __html: article.body }} />
          ) : (
            <p className="rte">No content available.</p>
          )}

          <div className="article__footer-nav text-center" style={{ marginTop: 40 }}>
            <Link href={backHref} className="btn btn--secondary">← Back to {backLabel}</Link>
          </div>
        </div>
      </div>
    </article>
  )
}
