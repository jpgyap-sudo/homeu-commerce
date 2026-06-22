/**
 * Server component that renders the homepage from DB-driven sections.
 * Every section config is merged with defaults from theme-builder-settings
 * so ALL keys (including new ones) are always present.
 */

import Link from 'next/link'
import Image from 'next/image'
import { query } from '@/lib/db'
import { HomepageSlideshow } from '@/components/HomepageSlideshow'
import { PreviewBridge } from '@/components/home/PreviewBridge'
import type { HomepageSection } from '@/lib/theme'
import { SECTION_META } from '@/lib/theme-types'
import { HOMEU_CURATED_COLLECTION_SLUGS } from '@/lib/homepage-collections'
import { mergeWithDefaults } from '@/lib/theme-builder-settings'
import ReviewsCarousel from '@/components/ReviewsCarousel'
import { formatPrice } from '@/lib/format-utils'
import { generateSectionStyles, ANIMATION_CSS, GRADIENT_TEXT_CSS } from '@/lib/theme-styles'
import SectionAnimation from '@/components/home/SectionAnimation'

// ── Data fetchers ────────────────────────────────────────────────────────
interface CollectionTile { id: number; title: string; slug: string; image_url: string | null }
interface ProductCard {
  id: number; title: string; slug: string; price: number | null; sale_price: number | null
  image_url: string | null; category_title: string | null
}

async function fetchCollections(featuredOnly: boolean, limit: number): Promise<CollectionTile[]> {
  try {
    const res = await query(
      `SELECT c.id, c.title, c.slug, c.image_url
       FROM categories c
       WHERE c.published = true AND c.image_url IS NOT NULL
       ${featuredOnly ? 'AND c.featured = true' : ''}
       ORDER BY c.position ASC, c.title ASC
       LIMIT $1`,
      [limit]
    )
    return res.rows
  } catch { return [] }
}

async function fetchCollectionsBySlugs(slugs: string[]): Promise<CollectionTile[]> {
  if (slugs.length === 0) return []
  try {
    const res = await query(
      `SELECT c.id, c.title, c.slug, c.image_url
       FROM categories c
       WHERE c.published = true AND c.slug = ANY($1::text[])`,
      [slugs]
    )
    const bySlug = new Map(res.rows.map((row: CollectionTile) => [row.slug, row]))
    return slugs.map(slug => bySlug.get(slug)).filter((row): row is CollectionTile => Boolean(row))
  } catch { return [] }
}

async function fetchProductsByCollection(slug: string, limit: number): Promise<ProductCard[]> {
  try {
    const res = await query(
      `SELECT DISTINCT ON (p.id) p.id, p.title, p.slug, p.price, p.sale_price,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url,
              cat.title AS category_title
       FROM products p
       JOIN collection_products cp ON cp.product_id = p.id
       JOIN categories col ON col.id = cp.collection_id
       LEFT JOIN categories cat ON cat.id = p.category_id
       WHERE p.status = 'active' AND col.slug = $1
       ORDER BY p.id ASC, cp.position ASC
       LIMIT $2`,
      [slug, limit]
    )
    return res.rows
  } catch { return [] }
}

async function fetchProductsAuto(limit: number): Promise<ProductCard[]> {
  try {
    const res = await query(
      `SELECT DISTINCT ON (p.id) p.id, p.title, p.slug, p.price, p.sale_price,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url,
              cat.title AS category_title
       FROM products p
       JOIN product_images pi2 ON pi2.product_id = p.id
       LEFT JOIN categories cat ON cat.id = p.category_id
       WHERE p.status = 'active'
       ORDER BY p.id ASC
       LIMIT $1`,
      [limit]
    )
    return res.rows
  } catch { return [] }
}

// ── Fetch products by explicit IDs (for "curated" source mode) ─────────
async function fetchProductsByIds(ids: number[]): Promise<ProductCard[]> {
  if (ids.length === 0) return []
  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const res = await query(
      `SELECT p.id, p.title, p.slug, p.price, p.sale_price,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url,
              cat.title AS category_title
       FROM products p
       LEFT JOIN categories cat ON cat.id = p.category_id
       WHERE p.id IN (${placeholders}) AND p.status = 'active'`,
      ids
    )
    // Preserve the original ordering from the ids array
    const map = new Map(res.rows.map((r: any) => [r.id, r]))
    return ids.map(id => map.get(id)).filter(Boolean)
  } catch { return [] }
}

function peso(n: number | null): string {
  return formatPrice(n)
}

interface FeaturedReview {
  id: string
  reviewer_name: string | null
  rating: number
  title: string | null
  body: string | null
  verified_purchase: boolean
  product_title: string
  product_slug: string
  product_image: string | null
}

async function fetchFeaturedReviews(limit: number): Promise<FeaturedReview[]> {
  try {
    const res = await query(
      `SELECT r.id, r.reviewer_name, r.rating, r.title, r.body, r.verified_purchase,
              p.title as product_title, p.slug as product_slug,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS product_image
       FROM reviews r
       JOIN products p ON p.id = r.product_id
       WHERE r.status = 'approved' AND r.rating >= 4 AND r.body IS NOT NULL AND length(r.body) > 0
       ORDER BY r.rating DESC, r.review_date DESC
       LIMIT $1`,
      [limit]
    )
    return res.rows
  } catch { return [] }
}

async function fetchReviewStats(): Promise<{ avg: number; count: number }> {
  try {
    const res = await query(
      `SELECT COUNT(*) as count, COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as avg
       FROM reviews WHERE status = 'approved'`,
      []
    )
    return { avg: parseFloat(res.rows[0]?.avg) || 0, count: parseInt(res.rows[0]?.count, 10) || 0 }
  } catch { return { avg: 0, count: 0 } }
}

// ── Individual section renderers ─────────────────────────────────────────
async function renderSection(section: HomepageSection) {
  // Merge DB config with full defaults so every setting key always exists
  const cfg = mergeWithDefaults(section.type, section.config)

  switch (section.type) {
    case 'slideshow': {
      const slides = (cfg.slides || []).map((s: any) => ({
        image: s.image, heading: s.heading, subheading: s.subheading,
        buttonLabel: s.buttonText || s.buttonLabel, buttonLink: s.buttonLink,
      }))
      return (
        <HomepageSlideshow
          slides={slides}
          autoRotate={cfg.autoRotate !== false}
          showArrows={cfg.showArrows !== false}
          showDots={cfg.showDots !== false}
          rotateInterval={(cfg.rotateInterval || 6) * 1000}
          height={cfg.height || 80}
          contentPosition={cfg.contentPosition || 'bottom'}
        />
      )
    }

    case 'brand_text':
      return (
        <section className="index-section homepage-brand-text text-center">
          <div className="page-width">
            <h2 className={`homepage-brand-text__title h2${cfg.logoAnim ? ' homeu-gradient-text' : ''}`} data-edit="title">{cfg.title || 'HOME ATELIER'}</h2>
            <p className="homepage-brand-text__body" data-edit="body">{cfg.body}</p>
          </div>
        </section>
      )

    case 'collection_grid': {
      const configuredSlugs = Array.isArray(cfg.curatedSlugs)
        ? cfg.curatedSlugs.filter((slug: unknown): slug is string => typeof slug === 'string' && slug.length > 0)
        : []
      const curatedSlugs = configuredSlugs.length > 0
        ? configuredSlugs.slice(0, 15)
        : [...HOMEU_CURATED_COLLECTION_SLUGS]
      const cols = cfg.source === 'all' || cfg.source === 'featured'
        ? await fetchCollections(cfg.source === 'featured', cfg.limit || 15)
        : await fetchCollectionsBySlugs(curatedSlugs)
      if (cols.length === 0) return null
      return (
        <section className="index-section homepage-collections">
          <div className="page-width">
            {cfg.heading && <div className="section-header text-center">
              <h2 className="section-header__title h2" data-edit="heading">{cfg.heading}</h2>
            </div>}
            <ul className="homeu-collection-grid" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 30 }}>
              {cols.map((c, index) => (
                <li key={c.id} className="homeu-collection-grid__cell" data-collection-index={index} style={{ display: 'block', width: '100%', minWidth: 0, margin: 0, padding: 0 }}>
                  <div className="homeu-collection-card" style={{ position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden' }}>
                  <Link href={`/products?category=${c.slug}`} className="homeu-collection-card__link" aria-label={`Browse ${c.title}`} style={{ position: 'absolute', inset: 0, display: 'block', color: '#fff', textDecoration: 'none' }}>
                    <div className="homeu-collection-card__media" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                      {c.image_url
                        ? <Image src={c.image_url} alt="" fill sizes="(max-width: 749px) 50vw, 33vw" className="homeu-collection-card__image" style={{ objectFit: 'cover', objectPosition: 'center top' }} unoptimized />
                        : <div className="homeu-collection-card__placeholder" />}
                    </div>
                    <div className="homeu-collection-card__title-wrap" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                      <h3 className="homeu-collection-card__title" style={{ position: 'absolute', top: '50%', width: '100%', margin: 0, padding: '0 15px', transform: 'translateY(-50%)', color: '#fff', fontFamily: "var(--debut-font-heading, 'Crimson Text', Georgia, serif)", fontSize: 29, fontWeight: 400, lineHeight: 1.2, textAlign: 'center', textShadow: '0 0 4px rgba(0, 0, 0, 0.4)' }}>{c.title}</h3>
                    </div>
                  </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )
    }

    case 'image_with_text':
      return (
        <section className="index-section homepage-image-text">
          <div className="homepage-image-text__inner">
            <div className="homepage-image-text__image-wrap" data-section-media="true">
              {cfg.image ? <Image src={cfg.image} data-edit-image="image" alt={cfg.title || ''} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
               : <div style={{ width: '100%', height: '100%', minHeight: 380, background: '#eef1ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa69c', fontSize: 14 }}>Click to add image</div>}
            </div>
            <div className="homepage-image-text__content">
              <h2 className="homepage-image-text__title h2" data-edit="title">{cfg.title}</h2>
              <p className="homepage-image-text__text" data-edit="text">{cfg.text}</p>
              {cfg.buttonText && cfg.buttonLink && (
                <Link href={cfg.buttonLink} className="btn btn--primary" data-edit="buttonText">{cfg.buttonText}</Link>
              )}
            </div>
          </div>
        </section>
      )

    case 'image_bar':
      return (
        <div className="homepage-image-bar">
          {(cfg.images || []).map((img: any, i: number) => {
            const inner = img.image
              ? <Image src={img.image} data-edit-image={`images.${i}.image`} alt={img.alt || `Image ${i + 1}`} fill style={{ objectFit: 'cover' }} sizes="33vw" unoptimized />
              : <div style={{ width: '100%', height: '100%', background: '#eef1ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa69c', fontSize: 12 }}>Click to add</div>
            return (
              <div key={i} className="homepage-image-bar__item" data-section-media="true">
                {img.link ? <Link href={img.link}>{inner}</Link> : inner}
              </div>
            )
          })}
        </div>
      )

    case 'featured_products': {
      // Three sourcing modes:
      // "curated" — hand-picked product IDs stored in curatedIds[]
      // "collection" — pull from a specific collection slug
      // "auto" (default) — newest active products with images
      const limit = cfg.limit || 10
      let products: ProductCard[] = []
      let viewAllHref = '/products'

      if (cfg.source === 'curated' && Array.isArray(cfg.curatedIds) && cfg.curatedIds.length > 0) {
        products = await fetchProductsByIds(cfg.curatedIds.slice(0, limit))
        viewAllHref = '/products'
      } else {
        const featuredSlug = (cfg.source === 'collection' && cfg.collectionSlug) ? cfg.collectionSlug : 'feature'
        products = await fetchProductsByCollection(featuredSlug, limit)
        if (products.length === 0) products = await fetchProductsAuto(limit)
        viewAllHref = `/collections/${featuredSlug}`
      }

      if (products.length === 0) return null
      const isCurated = cfg.source === 'curated'

      return (
        <section className="index-section homepage-featured-products" data-section-type="featured_products">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2" data-edit="heading">{cfg.heading || 'More Featured Pieces'}</h2>
            </div>
            <ul className="homeu-featured-grid product-grid" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '36px 24px' }}>
              {products.map((p, pIndex) => (
                <li key={p.id} className="homeu-featured-grid__cell" style={{ display: 'block', width: '100%', minWidth: 0, margin: 0, padding: 0 }}>
                  <div className="grid-product">
                    <Link href={`/products/${p.slug}`} className="grid-product__link" data-product-index={pIndex}>
                      <div className="grid-product__image-wrap" style={{ position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', background: '#fff' }}>
                        {p.image_url
                          ? <Image src={p.image_url} alt={p.title} width={600} height={600} sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, 25vw" className="grid-product__image" style={{ objectFit: 'contain', width: '100%', height: '100%', background: '#fff' }} unoptimized />
                          : <div className="grid-product__image-placeholder" />}
                        {/* Preview-only swap button overlay */}
                        <div className="homeu-product-swap-btn" data-product-index={pIndex}
                          style={{
                            position: 'absolute', top: 8, right: 8, zIndex: 5,
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)', color: '#fff',
                            display: 'none', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, cursor: 'pointer', lineHeight: 1,
                            backdropFilter: 'blur(4px)',
                            transition: 'all 150ms ease',
                          }}
                          title="Replace this product">🔄</div>
                      </div>
                      <div className="grid-product__meta">
                        <p className="grid-product__title">{p.title}</p>
                        <div className="grid-product__price">
                          {p.sale_price
                            ? <><span className="grid-product__price--current">{peso(p.sale_price)}</span> <span className="grid-product__price--original">{peso(p.price)}</span></>
                            : <span>{peso(p.price)}</span>}
                        </div>
                      </div>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            <div className="text-center homepage-featured-products__more">
              <Link href={viewAllHref} className="btn btn--secondary">View all</Link>
            </div>
          </div>
        </section>
      )
    }

    case 'reviews': {
      const maxReviews = Number(cfg.maxReviews) || 12
      const [featuredReviews, reviewStats] = await Promise.all([
        fetchFeaturedReviews(maxReviews),
        fetchReviewStats(),
      ])
      if (featuredReviews.length === 0) return null
      return (
        <section className="index-section homepage-reviews">
          <div className="page-width">
            <ReviewsCarousel
              heading={cfg.heading || 'Let Customers Speak For Us'}
              reviews={featuredReviews}
              avgRating={reviewStats.avg}
              reviewCount={reviewStats.count}
              columns={Number(cfg.columns) || 3}
              autoScroll={cfg.autoScroll !== false}
              scrollInterval={Number(cfg.scrollInterval) || 2}
            />
          </div>
        </section>
      )
    }

    case 'instagram': {
      const handle = cfg.handle || 'homeatelierph'
      const tiles = cfg.tiles || 6
      return (
        <section className="index-section homepage-instagram">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2" data-edit="heading">{cfg.heading || `Follow @${handle}`}</h2>
              <p className="section-header__sub">
                <a href={`https://www.instagram.com/${handle}/`} target="_blank" rel="noopener noreferrer" className="homepage-instagram__profile-link">See our latest on Instagram ↗</a>
              </p>
            </div>
            <div className="homepage-instagram__grid" id="instagram-feed">
              {Array.from({ length: tiles }).map((_, i) => (
                <a key={i} href={`https://www.instagram.com/${handle}/`} target="_blank" rel="noopener noreferrer" className="homepage-instagram__tile" aria-label="Instagram">
                  <span className="homepage-instagram__icon">
                    <svg viewBox="0 0 20 20" width="28" height="28" fill="currentColor"><path d="M10 1.8c2.67 0 2.99.01 4.04.06 2.76.13 4.04 1.41 4.17 4.17.05 1.05.06 1.36.06 4.04s-.01 2.99-.06 4.04c-.13 2.75-1.41 4.04-4.17 4.17-1.05.05-1.35.06-4.04.06s-2.99-.01-4.04-.06C3.2 18.16 1.92 16.88 1.79 14.12 1.74 13.07 1.73 12.76 1.73 10s.01-2.99.06-4.04C1.92 3.2 3.2 1.92 5.96 1.79 7.01 1.74 7.32 1.73 10 1.73zM10 0C7.28 0 6.94.01 5.88.06 2.25.23.23 2.25.06 5.88.01 6.94 0 7.28 0 10s.01 3.06.06 4.12c.17 3.63 2.19 5.65 5.82 5.82C6.94 19.99 7.28 20 10 20s3.06-.01 4.12-.06c3.63-.17 5.65-2.19 5.82-5.82.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12C19.77 2.25 17.75.23 14.12.06 13.06.01 12.72 0 10 0zm0 4.86a5.14 5.14 0 100 10.28A5.14 5.14 0 0010 4.86zm0 8.48a3.34 3.34 0 110-6.68 3.34 3.34 0 010 6.68zm5.34-9.78a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/></svg>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'cta':
      return (
        <section className="index-section homepage-cta">
          <div className="page-width">
            <div className="homepage-cta__inner text-center">
              <h2 className="h2" data-edit="heading">{cfg.heading}</h2>
              <p data-edit="text">{cfg.text}</p>
              <div className="homepage-cta__actions">
                {cfg.primaryText && cfg.primaryLink && <Link href={cfg.primaryLink} className="btn btn--primary" data-edit="primaryText">{cfg.primaryText}</Link>}
                {cfg.secondaryText && cfg.secondaryLink && <Link href={cfg.secondaryLink} className="btn btn--secondary" data-edit="secondaryText">{cfg.secondaryText}</Link>}
              </div>
            </div>
          </div>
        </section>
      )

    // ═════════════════════════════════════════════════════════════════
    //  NEW SECTIONS
    // ═════════════════════════════════════════════════════════════════

    case 'newsletter':
      return (
        <section className="index-section homepage-newsletter" style={{ background: cfg.bgColor || '#f9fafb' }}>
          <div className="page-width text-center" style={{ padding: '48px 0' }}>
            <h2 className="h2" data-edit="heading">{cfg.heading || 'Join our mailing list'}</h2>
            {cfg.subtext && <p style={{ marginBottom: 24, color: '#6b6b6b' }} data-edit="subtext">{cfg.subtext}</p>}
            <form onSubmit={async e => { e.preventDefault(); const fd = new FormData(e.currentTarget); await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fd.get('email') }) }); e.currentTarget.reset(); alert(cfg.successMessage || 'Thanks for subscribing!') }}
              style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto' }}>
              <input type="email" name="email" placeholder={cfg.placeholder || 'Enter your email'}
                required style={{ flex: 1, padding: '12px 16px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14 }} />
              <button type="submit" className="btn btn--primary" data-edit="buttonText">{cfg.buttonText || 'Subscribe'}</button>
            </form>
          </div>
        </section>
      )

    case 'logo_bar': {
      const logos: any[] = cfg.logos || []
      if (logos.length === 0) return null
      return (
        <section className="index-section homepage-logo-bar">
          <div className="page-width text-center" style={{ padding: '40px 0' }}>
            {cfg.heading && <h2 className="h4" style={{ marginBottom: 24, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.1em' }} data-edit="heading">{cfg.heading}</h2>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
              {logos.map((logo, i) => (
                <div key={i} style={{ opacity: 0.7, transition: 'opacity 200ms', filter: 'grayscale(1)' }} data-section-media="true">
                  {logo.image ? (logo.link
                    ? <a href={logo.link} target="_blank" rel="noopener noreferrer"><Image src={logo.image} data-edit-image={`logos.${i}.image`} alt={logo.alt || ''} width={120} height={48} style={{ objectFit: 'contain' }} unoptimized /></a>
                    : <Image src={logo.image} data-edit-image={`logos.${i}.image`} alt={logo.alt || ''} width={120} height={48} style={{ objectFit: 'contain' }} unoptimized />)
                  : <div style={{ width: 120, height: 48, background: '#eef1ed', borderRadius: 6 }} />}
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'testimonial': {
      const items: any[] = cfg.testimonials || []
      if (items.length === 0) return null
      return (
        <section className="index-section homepage-testimonials">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2" data-edit="heading">{cfg.heading || 'What Our Customers Say'}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              {items.map((t, i) => (
                <div key={i} style={{ background: '#ffffff', border: '1px solid #eef1ed', borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {t.avatar ? (
                    <Image src={t.avatar} data-edit-image={`testimonials.${i}.avatar`} alt={t.author} width={48} height={48} style={{ borderRadius: '50%', objectFit: 'cover' }} unoptimized />
                  ) : <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#eef1ed' }} />}
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: '#3a4339', fontStyle: 'italic', margin: 0 }} data-edit={`testimonials.${i}.quote`}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <strong style={{ fontSize: 14, color: '#151a17' }} data-edit={`testimonials.${i}.author`}>{t.author}</strong>
                    {t.role && <span style={{ fontSize: 12, color: '#9aa69c', marginLeft: 6 }} data-edit={`testimonials.${i}.role`}>{t.role}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'stats_counter': {
      const stats: any[] = cfg.stats || []
      if (stats.length === 0) return null
      return (
        <section className="index-section homepage-stats" style={{ background: '#151a17', color: '#fff', padding: '48px 0' }}>
          <div className="page-width text-center">
            {cfg.heading && <h2 className="h4" style={{ marginBottom: 32, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em' }} data-edit="heading">{cfg.heading}</h2>}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: 24 }}>
              {stats.map((s, i) => (
                <div key={i}>
                  {s.prefix && <span style={{ fontSize: 32, display: 'block', marginBottom: 4 }}>{s.prefix}</span>}
                  <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1 }} data-edit={`stats.${i}.number`}>{s.number}</div>
                  <div style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }} data-edit={`stats.${i}.label`}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'blog_posts': {
      const { rows: articles } = await query(
        `SELECT a.id, a.title, a.handle, a.image_url, a.published_at, b.title AS blog_title
         FROM articles a LEFT JOIN blogs b ON b.id = a.blog_id
         WHERE a.published_at IS NOT NULL
         ORDER BY a.published_at DESC
         LIMIT $1`,
        [cfg.limit || 4]
      )
      if (articles.length === 0) return null
      const isList = cfg.layout === 'list'
      return (
        <section className="index-section homepage-blog-posts">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2" data-edit="heading">{cfg.heading || 'From Our Journal'}</h2>
            </div>
            <div className={isList ? '' : `grid grid--uniform`} style={isList ? { display: 'flex', flexDirection: 'column', gap: 24 } : {}}>
              {articles.map((a: any) => (
                <div key={a.id} className={isList ? '' : 'grid__item medium-up--one-quarter small--one-half'}
                  style={isList ? { display: 'flex', gap: 20, alignItems: 'center', padding: 16, border: '1px solid #eef1ed', borderRadius: 12 } : {}}>
                  <Link href={`/blog/${a.handle}`} style={isList ? { flexShrink: 0, width: 160, height: 120 } : { display: 'block' }}>
                    {a.image_url
                      ? <Image src={a.image_url} alt={a.title} width={isList ? 160 : 400} height={isList ? 120 : 300} style={{ objectFit: 'cover', width: '100%', borderRadius: 8 }} unoptimized />
                      : <div style={{ width: '100%', height: isList ? 120 : 200, background: '#eef1ed', borderRadius: 8 }} />}
                  </Link>
                  <div style={{ flex: 1 }}>
                    <Link href={`/blog/${a.handle}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3 className="h4" style={{ margin: '0 0 4px' }}>{a.title}</h3>
                    </Link>
                    <p style={{ fontSize: 12, color: '#9aa69c', marginTop: 6 }}>
                      {new Date(a.published_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'promo_bar':
      return (
        <div style={{
          background: cfg.bgColor || '#151a17', color: cfg.textColor || '#fff',
          textAlign: 'center', padding: '10px 16px', fontSize: 14, fontWeight: 600,
        }}>
          {cfg.link
            ? <a href={cfg.link} style={{ color: 'inherit', textDecoration: 'none' }} data-edit="text">{cfg.text}</a>
            : <span data-edit="text">{cfg.text}</span>}
        </div>
      )

    case 'video_hero':
      return (
        <section className="index-section homepage-video-hero" style={{ position: 'relative', width: '100%', height: '90vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cfg.videoUrl && (
            <video autoPlay muted loop playsInline
              poster={cfg.posterImage || undefined}
              data-section-media="true"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
              <source src={cfg.videoUrl} type="video/mp4" />
            </video>
          )}
          {cfg.overlayColor && <div style={{ position: 'absolute', inset: 0, background: cfg.overlayColor }} />}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', maxWidth: 640, padding: '0 20px' }}>
            {cfg.heading && <h1 style={{ fontSize: 48, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.1 }} data-edit="heading">{cfg.heading}</h1>}
            {cfg.subheading && <p style={{ fontSize: 18, margin: '0 0 24px', opacity: 0.9 }} data-edit="subheading">{cfg.subheading}</p>}
            {cfg.buttonText && cfg.buttonLink && (
              <Link href={cfg.buttonLink} className="btn btn--primary" style={{ display: 'inline-block', padding: '14px 36px', fontSize: 16 }} data-edit="buttonText">
                {cfg.buttonText}
              </Link>
            )}
          </div>
        </section>
      )

    case 'lookbook': {
      const items: any[] = cfg.items || []
      if (items.length === 0) return null
      return (
        <section className="index-section homepage-lookbook">
          <div className="page-width">
            {cfg.heading && <div className="section-header text-center"><h2 className="section-header__title h2" data-edit="heading">{cfg.heading}</h2></div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, gridAutoRows: 'minmax(240px, auto)' }}>
              {items.map((item, i) => (
                <div key={i} style={{
                  gridColumn: `span ${Math.min(Number(item.colSpan) || 1, 3)}`,
                  gridRow: `span ${Math.min(Number(item.rowSpan) || 1, 3)}`,
                  borderRadius: 8, overflow: 'hidden', position: 'relative',
                }} data-section-media="true">
                  {item.image ? (item.link
                    ? <Link href={item.link} style={{ display: 'block', width: '100%', height: '100%' }}>
                        <Image src={item.image} data-edit-image={`items.${i}.image`} alt={item.title || ''} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
                      </Link>
                    : <Image src={item.image} data-edit-image={`items.${i}.image`} alt={item.title || ''} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" unoptimized />)
                  : <div style={{ width: '100%', height: '100%', minHeight: 240, background: '#eef1ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa69c' }}>Click to add image</div>}
                  {item.title && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }} data-edit={`items.${i}.title`}>{item.title}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    case 'category_carousel': {
      const cols = await fetchCollections(cfg.source === 'featured', cfg.limit || 10)
      if (cols.length === 0) return null
      return (
        <section className="index-section homepage-category-carousel">
          <div className="page-width">
            {cfg.heading && <div className="section-header text-center"><h2 className="section-header__title h2" data-edit="heading">{cfg.heading}</h2></div>}
            <div style={{
              display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch', paddingBottom: 12, scrollbarWidth: 'thin',
            }}>
              {cols.map(c => (
                <Link key={c.id} href={`/products?category=${c.slug}`}
                  style={{
                    flex: '0 0 auto', width: 220, scrollSnapAlign: 'start', textDecoration: 'none',
                    borderRadius: 12, overflow: 'hidden', border: '1px solid #eef1ed', background: '#fff',
                  }}>
                  <div style={{ height: 220, position: 'relative' }}>
                    {c.image_url
                      ? <Image src={c.image_url} alt={c.title} fill style={{ objectFit: 'cover' }} sizes="220px" unoptimized />
                      : <div style={{ width: '100%', height: '100%', background: '#eef1ed' }} />}
                  </div>
                  <div style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#151a17' }}>{c.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )
    }

    default:
      return null
  }
}

/** Section types that belong to the footer, NOT the homepage body. */
export const FOOTER_SECTION_TYPES = new Set(['footer_brand', 'footer_quick_links', 'footer_newsletter', 'footer_social'])

/** Default bottom spacing per section type (px). Zero-spacing sections like promo_bar stay flush. */
const DEFAULT_SECTION_GAP: Record<string, number> = {
  promo_bar: 0,
  slideshow: 40,
  image_bar: 32,
}
function defaultGap(type: string): number {
  return DEFAULT_SECTION_GAP[type] ?? 60
}

export async function HomeSections({ sections, preview = false }: { sections: HomepageSection[]; preview?: boolean }) {
  // Only render homepage body sections — footer sections are rendered by SiteFooter
  const bodySections = sections.filter(s => !FOOTER_SECTION_TYPES.has(s.type))
  const rendered = await Promise.all(bodySections.map(s => renderSection(s)))
  return (
    <>
      {/* Global animation and gradient text CSS injected once */}
      {!preview && (
        <style
          id="homeu-anim-css"
          dangerouslySetInnerHTML={{ __html: `${ANIMATION_CSS}${GRADIENT_TEXT_CSS}` }}
        />
      )}
      {rendered.map((node, i) => {
        const sec = bodySections[i]
        const gap = defaultGap(sec.type)
        const cfg = mergeWithDefaults(sec.type, sec.config)
        const sectionContent = (
          <div
            key={sec.id}
            data-section-id={sec.id}
            data-section-type={sec.type}
            data-section-label={SECTION_META[sec.type]?.label || sec.type}
            className={preview ? 'homeu-preview-section' : undefined}
            style={{
              marginTop: sec.config?.spacingTop != null ? Number(sec.config.spacingTop) : undefined,
              marginBottom: sec.config?.spacingBottom != null ? Number(sec.config.spacingBottom) : gap,
            }}
          >
            {/* Runtime CSS injection from section settings */}
            <style dangerouslySetInnerHTML={{ __html: generateSectionStyles(sec.id, cfg, sec.type) }} />
            {node}
          </div>
        )
        // Wrap in SectionAnimation if not in preview mode
        return preview
          ? sectionContent
          : <SectionAnimation key={sec.id} anim={cfg.animation} delay={cfg.animationDelay}>{sectionContent}</SectionAnimation>
      })}
      {preview && <PreviewBridge />}
    </>
  )
}
