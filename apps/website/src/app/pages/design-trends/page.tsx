import Link from 'next/link'
import { query } from '@/lib/db'
import { excerptFromHtml } from '@/lib/excerpt'

interface Article {
  id: number
  handle: string
  title: string
  published_at: string | null
  image_url: string | null
  image_alt: string | null
  body: string | null
}

async function getArticles(): Promise<Article[]> {
  try {
    const res = await query(
      `SELECT a.id, a.handle, a.title, a.published_at, a.image_url, a.image_alt, a.body
       FROM articles a JOIN blogs b ON b.id = a.blog_id
       WHERE b.handle = 'design-trends'
       ORDER BY a.published_at DESC NULLS LAST`,
      []
    )
    return res.rows
  } catch { return [] }
}

export const metadata = {
  title: 'Interior Design Ideas',
  description: 'Interior design trends, tips and inspiration from Home Atelier.',
}

// 1:1 clone of https://homeu.ph/blogs/design-trends — moved to a static page
// per request, instead of living under /blog.
export default async function DesignTrendsPage() {
  const articles = await getArticles()

  return (
    <article className="page-width">
      <div className="grid">
        <div className="grid__item">
          <div className="section-header text-center">
            <h1 className="article__title">Interior Design Ideas</h1>
          </div>

          {articles.length > 0 ? (
            <ul className="grid grid--uniform grid--blog">
              {articles.map(article => (
                <li key={article.id} className="grid__item medium-up--one-third">
                  <Link href={`/blog/design-trends/${article.handle}`} className="article__link">
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
                          href={`/blog/design-trends/${article.handle}`}
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
            <p className="blog-empty">No articles yet.</p>
          )}
        </div>
      </div>
    </article>
  )
}
