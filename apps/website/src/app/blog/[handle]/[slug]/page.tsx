import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { query } from '@/lib/db'

interface Article {
  id: number
  title: string
  handle: string
  body: string | null
  author_name: string | null
  published_at: string | null
  image_url: string | null
  image_alt: string | null
  tags: string[]
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

async function getRelatedArticles(blogId: number, currentId: number) {
  try {
    const res = await query(
      `SELECT id, handle, title, image_url, published_at
       FROM articles WHERE blog_id = $1 AND id != $2
       ORDER BY published_at DESC NULLS LAST LIMIT 3`,
      [blogId, currentId]
    )
    return res.rows
  } catch { return [] }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>
}) {
  const { handle, slug } = await params
  const article = await getArticle(handle, slug)
  if (!article) return { title: 'Article not found' }
  return {
    title: article.title,
    openGraph: article.image_url
      ? { images: [{ url: article.image_url }] }
      : undefined,
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>
}) {
  const { handle, slug } = await params
  const article = await getArticle(handle, slug)
  if (!article) notFound()

  const related = await getRelatedArticles(article.blog_id, article.id)

  return (
    <>
      {/* Breadcrumb */}
      <nav className="breadcrumb page-width" aria-label="Breadcrumb">
        <ol className="breadcrumb__list">
          <li><Link href="/">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/blog">Journal</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={`/blog/${article.blog_handle}`}>{article.blog_title}</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page">{article.title}</li>
        </ol>
      </nav>

      {/* Hero — full-width banner with the title over a dark scrim (or a
          plain centered header when there is no featured image) */}
      {article.image_url ? (
        <header className="article-hero">
          <Image
            src={article.image_url}
            alt={article.image_alt || article.title}
            fill
            className="article-hero__bg"
            style={{ objectFit: 'cover' }}
            sizes="100vw"
            priority
            unoptimized
          />
          <div className="article-hero__inner page-width">
            <Link href={`/blog/${article.blog_handle}`} className="article-hero__blog-link">
              {article.blog_title}
            </Link>
            <h1 className="article-hero__title">{article.title}</h1>
            <div className="article-hero__byline">
              {article.author_name && <span>By {article.author_name}</span>}
              {article.author_name && article.published_at && <span> · </span>}
              {article.published_at && (
                <time dateTime={article.published_at}>
                  {new Date(article.published_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
              )}
            </div>
          </div>
        </header>
      ) : (
        <header className="article-page page-width article-page__plainhead">
          <Link href={`/blog/${article.blog_handle}`} className="article-page__blog-link">{article.blog_title}</Link>
          <h1 className="article-page__title">{article.title}</h1>
          <div className="article-page__byline">
            {article.author_name && <span>By {article.author_name}</span>}
            {article.author_name && article.published_at && <span> · </span>}
            {article.published_at && (
              <time dateTime={article.published_at}>
                {new Date(article.published_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            )}
          </div>
        </header>
      )}

      <article className="article-page page-width">
        {/* Body */}
        {article.body ? (
          <div
            className="article-page__body rte"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
        ) : (
          <p className="article-page__body">No content available.</p>
        )}

        {/* Tags */}
        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="article-page__tags">
            <strong>Tags: </strong>
            {article.tags.map(tag => (
              <span key={tag} className="article-page__tag">{tag}</span>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="article-page__footer-nav">
          <Link href={`/blog/${article.blog_handle}`} className="btn btn--secondary">
            ← Back to {article.blog_title}
          </Link>
        </div>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="index-section page-width">
          <div className="section-header text-center">
            <h2 className="section-header__title h2">More from {article.blog_title}</h2>
          </div>
          <div className="blog-grid blog-grid--3">
            {related.map((r: any) => (
              <article key={r.id} className="blog-card">
                <Link href={`/blog/${handle}/${r.handle}`} className="blog-card__link">
                  <div className="blog-card__image-wrap">
                    {r.image_url ? (
                      <Image
                        src={r.image_url}
                        alt={r.title}
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
                    <h3 className="blog-card__title">{r.title}</h3>
                    {r.published_at && (
                      <p className="blog-card__date">
                        {new Date(r.published_at).toLocaleDateString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
