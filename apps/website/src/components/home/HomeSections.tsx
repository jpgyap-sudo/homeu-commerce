/**
 * Server component that renders the homepage from DB-driven sections.
 * Each section type maps to a block of markup (Debut CSS classes preserved).
 * Data needed by data-driven sections (collections, products) is fetched here.
 */

import Link from 'next/link'
import Image from 'next/image'
import { query } from '@/lib/db'
import { HomepageSlideshow } from '@/components/HomepageSlideshow'
import type { HomepageSection } from '@/lib/theme'

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

function peso(n: number | null): string {
  if (n == null) return ''
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

// ── Individual section renderers ─────────────────────────────────────────
async function renderSection(section: HomepageSection) {
  const cfg = section.config || {}

  switch (section.type) {
    case 'slideshow': {
      const slides = (cfg.slides || []).map((s: any) => ({
        image: s.image, heading: s.heading, subheading: s.subheading,
        buttonLabel: s.buttonText || s.buttonLabel, buttonLink: s.buttonLink,
      }))
      return <HomepageSlideshow slides={slides} />
    }

    case 'brand_text':
      return (
        <section className="index-section homepage-brand-text text-center">
          <div className="page-width">
            <h2 className="homepage-brand-text__title h2">{cfg.title || 'HOME ATELIER'}</h2>
            <p className="homepage-brand-text__body">{cfg.body}</p>
          </div>
        </section>
      )

    case 'collection_grid': {
      const cols = await fetchCollections(cfg.source === 'featured', cfg.limit || 15)
      if (cols.length === 0) return null
      return (
        <section className="index-section homepage-collections">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2">{cfg.heading || 'Shop by Collection'}</h2>
            </div>
            <ul className="collection-list grid grid--uniform">
              {cols.map(c => (
                <li key={c.id} className="collection-list__item grid__item medium-up--one-quarter small--one-half">
                  <Link href={`/products?category=${c.slug}`} className="collection-list__item-link">
                    <div className="collection-list__image-wrapper">
                      {c.image_url
                        ? <Image src={c.image_url} alt={c.title} width={400} height={300} className="collection-list__image" style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                        : <div className="collection-list__image-placeholder" />}
                    </div>
                    <p className="collection-list__title h4">{c.title}</p>
                  </Link>
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
            <div className="homepage-image-text__image-wrap">
              {cfg.image && <Image src={cfg.image} alt={cfg.title || ''} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 50vw" unoptimized />}
            </div>
            <div className="homepage-image-text__content">
              <h2 className="homepage-image-text__title h2">{cfg.title}</h2>
              <p className="homepage-image-text__text">{cfg.text}</p>
              {cfg.buttonText && cfg.buttonLink && (
                <Link href={cfg.buttonLink} className="btn btn--primary">{cfg.buttonText}</Link>
              )}
            </div>
          </div>
        </section>
      )

    case 'image_bar':
      return (
        <div className="homepage-image-bar">
          {(cfg.images || []).map((img: any, i: number) => {
            const inner = <Image src={img.image} alt={img.alt || `Image ${i + 1}`} fill style={{ objectFit: 'cover' }} sizes="33vw" unoptimized />
            return (
              <div key={i} className="homepage-image-bar__item">
                {img.link ? <Link href={img.link}>{inner}</Link> : inner}
              </div>
            )
          })}
        </div>
      )

    case 'featured_products': {
      const products = cfg.source === 'collection' && cfg.collectionSlug
        ? await fetchProductsByCollection(cfg.collectionSlug, cfg.limit || 12)
        : await fetchProductsAuto(cfg.limit || 12)
      if (products.length === 0) return null
      return (
        <section className="index-section homepage-featured-products">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2">{cfg.heading || 'More Featured Pieces'}</h2>
            </div>
            <ul className="grid grid--uniform product-grid">
              {products.map(p => (
                <li key={p.id} className="grid__item medium-up--one-quarter small--one-half">
                  <div className="grid-product">
                    <Link href={`/products/${p.slug}`} className="grid-product__link">
                      <div className="grid-product__image-wrap">
                        {p.image_url
                          ? <Image src={p.image_url} alt={p.title} width={400} height={400} className="grid-product__image" style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                          : <div className="grid-product__image-placeholder" />}
                      </div>
                      <div className="grid-product__meta">
                        {p.category_title && <p className="grid-product__vendor">{p.category_title}</p>}
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
            <div className="text-center" style={{ marginTop: 32 }}>
              <Link href="/products" className="btn btn--secondary">View All Products</Link>
            </div>
          </div>
        </section>
      )
    }

    case 'reviews':
      return (
        <section className="index-section homepage-reviews">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2">{cfg.heading || 'What Our Customers Say'}</h2>
            </div>
            <div className="jdgm-widget jdgm-carousel-widget" data-number-of-columns="3" data-auto-scroll="true" data-scroll-interval="2000" data-scroll-animation-duration="400" />
          </div>
        </section>
      )

    case 'instagram': {
      const handle = cfg.handle || 'homeatelierph'
      const tiles = cfg.tiles || 6
      return (
        <section className="index-section homepage-instagram">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2">{cfg.heading || `Follow @${handle}`}</h2>
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
              <h2 className="h2">{cfg.heading}</h2>
              <p>{cfg.text}</p>
              <div className="homepage-cta__actions">
                {cfg.primaryText && cfg.primaryLink && <Link href={cfg.primaryLink} className="btn btn--primary">{cfg.primaryText}</Link>}
                {cfg.secondaryText && cfg.secondaryLink && <Link href={cfg.secondaryLink} className="btn btn--secondary">{cfg.secondaryText}</Link>}
              </div>
            </div>
          </div>
        </section>
      )

    default:
      return null
  }
}

export async function HomeSections({ sections }: { sections: HomepageSection[] }) {
  const rendered = await Promise.all(sections.map(s => renderSection(s)))
  return <>{rendered.map((node, i) => <div key={sections[i].id}>{node}</div>)}</>
}
