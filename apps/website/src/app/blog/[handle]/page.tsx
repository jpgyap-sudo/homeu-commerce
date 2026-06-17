import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { query } from '@/lib/db'

interface Article {
  id: number
  handle: string
  title: string
  author_name: string | null
  published_at: string | null
  image_url: string | null
  image_alt: string | null
  tags: string[]
}

interface Blog {
  id: number
  handle: string
  title: string
  articles: Article[]
}

async function getBlog(handle: string): Promise<Blog | null> {
  try {
    const blogRes = await query(
      `SELECT id, handle, title FROM blogs WHERE handle = $1`,
      [handle]
    )
    if (blogRes.rows.length === 0) return null
    const blog = blogRes.rows[0]

    const artRes = await query(
      `SELECT id, handle, title, author_name, published_at, image_url, image_alt, tags
       FROM articles WHERE blog_id = $1
       ORDER BY published_at DESC NULLS LAST`,
      [blog.id]
    )
    return { ...blog, articles: artRes.rows }
  } catch { return null }
}

async function getAllBlogs() {
  try {
    const res = await query(`SELECT handle, title FROM blogs ORDER BY id ASC`, [])
    return res.rows
  } catch { return [] }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  return { title: handle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
}

export default async function BlogListPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const [blog, allBlogs] = await Promise.all([getBlog(handle), getAllBlogs()])

  if (!blog) notFound()

  return (
    <>
      <div className="page-banner">
        <div className="page-width">
          <h1 className="page-banner__title">{blog.title}</h1>
        </div>
      </div>

      <div className="page-width blog-index">
        {/* Blog nav */}
        <nav className="blog-nav">
          <Link href="/blog" className="blog-nav__item">All Posts</Link>
          {allBlogs.map((b: any) => (
            <Link
              key={b.handle}
              href={`/blog/${b.handle}`}
              className={`blog-nav__item${b.handle === handle ? ' blog-nav__item--active' : ''}`}
            >
              {b.title}
            </Link>
          ))}
        </nav>

        {blog.articles.length > 0 ? (
          <div className="blog-grid">
            {blog.articles.map(article => (
              <article key={article.id} className="blog-card">
                <Link href={`/blog/${handle}/${article.handle}`} className="blog-card__link">
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
                    <h2 className="blog-card__title">{article.title}</h2>
                    {article.author_name && (
                      <p className="blog-card__author">By {article.author_name}</p>
                    )}
                    {article.published_at && (
                      <p className="blog-card__date">
                        {new Date(article.published_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    )}
                    {Array.isArray(article.tags) && article.tags.length > 0 && (
                      <ul className="blog-card__tags">
                        {article.tags.slice(0, 3).map(tag => (
                          <li key={tag} className="blog-card__tag">{tag}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="blog-empty">No articles in this blog yet.</p>
        )}
      </div>
    </>
  )
}
