import Link from 'next/link'
import Image from 'next/image'
import { query } from '@/lib/db'
import { HomepageSlideshow } from '@/components/HomepageSlideshow'

interface FeaturedCategory {
  id: number
  title: string
  slug: string
  image_url: string | null
}

interface FeaturedProduct {
  id: number
  title: string
  slug: string
  price: number | null
  sale_price: number | null
  image_url: string | null
  category_title: string | null
  category_slug: string | null
}

async function getFeaturedCategories(): Promise<FeaturedCategory[]> {
  try {
    const result = await query(
      `SELECT c.id, c.title, c.slug,
         COALESCE(m.url, c.image_url) as image_url
       FROM categories c
       LEFT JOIN media m ON c.image_id = m.id
       WHERE (c.image_id IS NOT NULL OR c.image_url IS NOT NULL)
       ORDER BY c.id ASC
       LIMIT 15`,
      []
    )
    return result.rows
  } catch { return [] }
}

async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  try {
    const result = await query(
      `SELECT DISTINCT ON (p.id)
         p.id, p.title, p.slug, p.price, p.sale_price,
         pi.url as image_url,
         cat.title as category_title,
         cat.slug as category_slug
       FROM products p
       JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN categories cat ON cat.id = p.category_id
       ORDER BY p.id ASC, pi.sort_order ASC
       LIMIT 8`,
      []
    )
    return result.rows
  } catch { return [] }
}

function formatPrice(price: number | null): string {
  if (price == null) return ''
  return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getFeaturedCategories(),
    getFeaturedProducts(),
  ])

  return (
    <>
      {/* ── Slideshow ─────────────────────────────────────────────────── */}
      <HomepageSlideshow />

      {/* ── Brand text ───────────────────────────────────────────────── */}
      <section className="index-section homepage-brand-text text-center">
        <div className="page-width">
          <h2 className="homepage-brand-text__title h2">HOME ATELIER</h2>
          <p className="homepage-brand-text__body">
            We love to collect and put together different interior pieces for home lovers.
            Good taste is our guide. We believe in timeless design made of true quality and
            personalization. We offer an accurate and customized customer care and a comprehensive
            catalog ranging from kitchen to living, from home to hospitality, from furnishings to
            lighting solutions.
          </p>
        </div>
      </section>

      {/* ── Shop by Collection ────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="index-section homepage-collections">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2">Shop by Collection</h2>
            </div>
            <ul className="collection-list grid grid--uniform">
              {categories.map(cat => (
                <li key={cat.id} className="collection-list__item grid__item medium-up--one-quarter small--one-half">
                  <Link href={`/products?category=${cat.slug}`} className="collection-list__item-link">
                    <div className="collection-list__image-wrapper">
                      {cat.image_url ? (
                        <Image
                          src={cat.image_url}
                          alt={cat.title}
                          width={400}
                          height={300}
                          className="collection-list__image"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          unoptimized
                        />
                      ) : (
                        <div className="collection-list__image-placeholder" />
                      )}
                    </div>
                    <p className="collection-list__title h4">{cat.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Wall Panels hero ─────────────────────────────────────────── */}
      <section className="index-section homepage-image-text">
        <div className="homepage-image-text__inner">
          <div className="homepage-image-text__image-wrap">
            <Image
              src="https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture5_e00bd4c4-58c8-4b53-a4ad-8d43d94314ca.jpg?v=1618751639"
              alt="Mix and match wall panels"
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized
            />
          </div>
          <div className="homepage-image-text__content">
            <h2 className="homepage-image-text__title h2">Mix and match wall panels</h2>
            <p className="homepage-image-text__text">
              WPC wall panels offer premium aesthetics and durability. Water-resistant, eco-friendly,
              and available in a wide range of textures — perfect for accent walls, home offices,
              and commercial spaces.
            </p>
            <Link href="/products?category=wall-panels" className="btn btn--primary">
              Shop Wall Panels
            </Link>
          </div>
        </div>
      </section>

      {/* ── Image bar ────────────────────────────────────────────────── */}
      <div className="homepage-image-bar">
        {[
          { src: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture21.jpg?v=1618749947', alt: 'Interior 1' },
          { src: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture20.jpg?v=1618749610', alt: 'Interior 2' },
          { src: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture22.jpg?v=1618751994', alt: 'Interior 3' },
        ].map(img => (
          <div key={img.src} className="homepage-image-bar__item">
            <Image
              src={img.src}
              alt={img.alt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="33vw"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* ── Featured Products ─────────────────────────────────────────── */}
      {products.length > 0 && (
        <section className="index-section homepage-featured-products">
          <div className="page-width">
            <div className="section-header text-center">
              <h2 className="section-header__title h2">Featured Products</h2>
            </div>
            <ul className="grid grid--uniform product-grid">
              {products.map(product => (
                <li key={product.id} className="grid__item medium-up--one-quarter small--one-half">
                  <div className="grid-product">
                    <Link href={`/products/${product.slug}`} className="grid-product__link">
                      <div className="grid-product__image-wrap">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.title}
                            width={400}
                            height={400}
                            className="grid-product__image"
                            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                            unoptimized
                          />
                        ) : (
                          <div className="grid-product__image-placeholder" />
                        )}
                      </div>
                      <div className="grid-product__meta">
                        {product.category_title && (
                          <p className="grid-product__vendor">{product.category_title}</p>
                        )}
                        <p className="grid-product__title">{product.title}</p>
                        <div className="grid-product__price">
                          {product.sale_price ? (
                            <>
                              <span className="grid-product__price--current">{formatPrice(product.sale_price)}</span>
                              <span className="grid-product__price--original">{formatPrice(product.price)}</span>
                            </>
                          ) : (
                            <span>{formatPrice(product.price)}</span>
                          )}
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
      )}

      {/* ── Judge.me Review Carousel ──────────────────────────────────── */}
      <section className="index-section homepage-reviews">
        <div className="page-width">
          <div className="section-header text-center">
            <h2 className="section-header__title h2">What Our Customers Say</h2>
          </div>
          <div
            className="jdgm-widget jdgm-carousel-widget"
            data-number-of-columns="3"
            data-auto-scroll="true"
            data-scroll-interval="2000"
            data-scroll-animation-duration="400"
          />
        </div>
      </section>

      {/* ── Instagram ────────────────────────────────────────────────── */}
      <section className="index-section homepage-instagram">
        <div className="page-width">
          <div className="section-header text-center">
            <h2 className="section-header__title h2">Follow @homeatelierph</h2>
            <p className="section-header__sub">
              <a
                href="https://www.instagram.com/homeatelierph/"
                target="_blank"
                rel="noopener noreferrer"
                className="homepage-instagram__profile-link"
              >
                See our latest on Instagram ↗
              </a>
            </p>
          </div>
          {/* Instagram feed widget — wire up via Instagram Basic Display API when token is ready */}
          <div className="homepage-instagram__grid" id="instagram-feed">
            {/* Placeholder tiles until Instagram token is configured */}
            {Array.from({ length: 6 }).map((_, i) => (
              <a
                key={i}
                href="https://www.instagram.com/homeatelierph/"
                target="_blank"
                rel="noopener noreferrer"
                className="homepage-instagram__tile"
                aria-label="HomeU on Instagram"
              >
                <span className="homepage-instagram__icon">
                  <svg viewBox="0 0 20 20" width="28" height="28" fill="currentColor">
                    <path d="M10 1.8c2.67 0 2.99.01 4.04.06 2.76.13 4.04 1.41 4.17 4.17.05 1.05.06 1.36.06 4.04s-.01 2.99-.06 4.04c-.13 2.75-1.41 4.04-4.17 4.17-1.05.05-1.35.06-4.04.06s-2.99-.01-4.04-.06C3.2 18.16 1.92 16.88 1.79 14.12 1.74 13.07 1.73 12.76 1.73 10s.01-2.99.06-4.04C1.92 3.2 3.2 1.92 5.96 1.79 7.01 1.74 7.32 1.73 10 1.73zM10 0C7.28 0 6.94.01 5.88.06 2.25.23.23 2.25.06 5.88.01 6.94 0 7.28 0 10s.01 3.06.06 4.12c.17 3.63 2.19 5.65 5.82 5.82C6.94 19.99 7.28 20 10 20s3.06-.01 4.12-.06c3.63-.17 5.65-2.19 5.82-5.82.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12C19.77 2.25 17.75.23 14.12.06 13.06.01 12.72 0 10 0zm0 4.86a5.14 5.14 0 100 10.28A5.14 5.14 0 0010 4.86zm0 8.48a3.34 3.34 0 110-6.68 3.34 3.34 0 010 6.68zm5.34-9.78a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/>
                  </svg>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────── */}
      <section className="index-section homepage-cta">
        <div className="page-width">
          <div className="homepage-cta__inner text-center">
            <h2 className="h2">Trade & Bulk Enquiries</h2>
            <p>Are you an interior designer, architect, or developer? Join our Designer Club for exclusive pricing and priority service.</p>
            <div className="homepage-cta__actions">
              <Link href="/pages/designerclub" className="btn btn--primary">Join Designer Club</Link>
              <Link href="/quote-cart" className="btn btn--secondary">Request a Quote</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
