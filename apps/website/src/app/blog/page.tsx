export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { query } from '@/lib/db'
import { excerptFromHtml } from '@/lib/excerpt'

interface ArticlePreview {
  id: number
  handle: string
  title: string
  published_at: string | null
  image_url: string | null
  image_alt: string | null
  body: string | null
  blog_handle: string
}

async function getRecentArticles(): Promise<ArticlePreview[]> {
  try {
    const res = await query(
      `SELECT a.id, a.handle, a.title, a.published_at, a.image_url, a.image_alt, a.body,
              b.handle as blog_handle
       FROM articles a
       JOIN blogs b ON b.id = a.blog_id
       WHERE b.handle != 'design-trends'
       ORDER BY a.published_at DESC NULLS LAST
       LIMIT 12`,
      []
    )
    return res.rows
  } catch { return [] }
}

export const metadata = {
  title: 'Blog',
  description: 'Design trends, interior inspiration, and material guides from HomeU',
}

export default async function BlogIndexPage() {
  const recent = await getRecentArticles()

  return (
    <article className="page-width">
      <div className="grid">
        <div className="grid__item">
          <div className="section-header text-center">
            <h1 className="article__title">Blogs</h1>
          </div>

          {recent.length > 0 ? (
            <ul className="grid grid--uniform grid--blog">
              {recent.map(article => (
                <li key={article.id} className="grid__item medium-up--one-third">
                  <Link href={`/blog/${article.blog_handle}/${article.handle}`} className="article__link">
                    <div className="article__grid-image-wrapper">
                      <div className="article__grid-image-container" style={{ paddingTop: '100%' }}>
                        {article.image_url ? (
                          <img
                            className="article__grid-image"
                            src={article.image_url}
                            alt={article.image_alt || article.title}
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                    </div>
                    <h2 className="article__title h3 article__title--has-image">{article.title}</h2>
                  </Link>

                  <div className="article__grid-meta article__grid-meta--has-image">
                    {article.published_at && (
                      <span className="article__date">
                        <time dateTime={article.published_at}>
                          {new Date(article.published_at).toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </time>
                      </span>
                    )}
                    <div className="rte article__grid-excerpt">
                      {excerptFromHtml(article.body, 160)}
                    </div>
                    <ul className="list--inline article__meta-buttons">
                      <li>
                        <Link
                          href={`/blog/${article.blog_handle}/${article.handle}`}
                          className="btn btn--tertiary btn--small"
                          aria-label={`Read more: ${article.title}`}
                        >
                          Read more
                        </Link>
                      </li>
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="blog-empty">
              <p>No articles yet.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
