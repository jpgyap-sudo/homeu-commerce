import Link from 'next/link'
import Image from 'next/image'
import { query } from '@/lib/db'

interface BlogRow {
  id: number
  handle: string
  title: string
  article_count: number
  last_published: string | null
}

interface ArticlePreview {
  id: number
  handle: string
  title: string
  published_at: string | null
  image_url: string | null
  image_alt: string | null
  blog_handle: string
  blog_title: string
}

async function getBlogs(): Promise<BlogRow[]> {
  try {
    const res = await query(
      `SELECT b.id, b.handle, b.title, b.created_at,
              COUNT(a.id)::int as article_count,
              MAX(a.published_at) as last_published
       FROM blogs b
       LEFT JOIN articles a ON a.blog_id = b.id
       GROUP BY b.id ORDER BY b.id ASC`,
      []
    )
    return res.rows
  } catch { return [] }
}

async function getRecentArticles(): Promise<ArticlePreview[]> {
  try {
    const res = await query(
      `SELECT a.id, a.handle, a.title, a.published_at, a.image_url, a.image_alt,
              b.handle as blog_handle, b.title as blog_title
       FROM articles a
       JOIN blogs b ON b.id = a.blog_id
       ORDER BY a.published_at DESC NULLS LAST
       LIMIT 6`,
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
  const [blogs, recent] = await Promise.all([getBlogs(), getRecentArticles()])

  return (
    <>
      <div className="page-banner">
        <div className="page-width">
          <h1 className="page-banner__title">Journal</h1>
          <p className="page-banner__sub">Design trends, material guides, and interior inspiration</p>
        </div>
      </div>

      <div className="page-width blog-index">
        {/* Blog categories */}
        {blogs.length > 0 && (
          <nav className="blog-nav">
            <Link href="/blog" className="blog-nav__item blog-nav__item--active">All Posts</Link>
            {blogs.map(b => (
              <Link key={b.id} href={`/blog/${b.handle}`} className="blog-nav__item">
                {b.title}
                <span className="blog-nav__count">{b.article_count}</span>
              </Link>
            ))}
          </nav>
        )}

        {/* Recent articles grid */}
        {recent.length > 0 ? (
          <div className="blog-grid">
            {recent.map(article => (
              <article key={article.id} className="blog-card">
                <Link href={`/blog/${article.blog_handle}/${article.handle}`} className="blog-card__link">
                  <div className="blog-card__image-wrap">
                    {article.image_url ? (
                      <Image
                        src={article.image_url}
                        alt={article.image_alt || article.title}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="blog-card__image-placeholder" />
                    )}
                  </div>
                  <div className="blog-card__meta">
                    <p className="blog-card__category">{article.blog_title}</p>
                    <h2 className="blog-card__title">{article.title}</h2>
                    {article.published_at && (
                      <p className="blog-card__date">
                        {new Date(article.published_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="blog-empty">
            <p>No articles yet. Run <code>node tools/shopify-import/import-blogs.mjs</code> to import blog content.</p>
          </div>
        )}
      </div>
    </>
  )
}
