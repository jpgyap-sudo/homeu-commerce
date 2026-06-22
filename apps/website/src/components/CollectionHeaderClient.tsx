'use client'

interface Category {
  title: string
  slug: string
  imageUrl?: string | null
  description?: string | null
}

const SWATCH_CATEGORY_SLUGS = new Set([
  'veratti-sinteredstone', 'sintered-stone', 'natural-stone',
  'fabric-swatches-linen', 'fabric-swatches-velvet', 'swatches-tech-cloth',
  'fabric-swatches-leather', 'fabric-swatches-leatherette',
])

export default function CollectionHeaderClient({ category, config = {} }: { category: Category; config?: any }) {
  const showDescription = config.showDescription !== false
  const showBanner = config.showBanner !== false
  const bannerHeight = config.bannerHeight || 300

  const collectionTitle = category?.title || 'Our Products'
  const isSwatch = category?.slug ? SWATCH_CATEGORY_SLUGS.has(category.slug) : false

  if (!showBanner) {
    return (
      <header className="page-width" style={{ paddingTop: 40, paddingBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--debut-font-heading)', fontSize: 36, margin: 0 }}>{collectionTitle}</h1>
        {showDescription && category?.description && (
          <div style={{ marginTop: 12, fontSize: 15, color: '#67706a', maxWidth: 800 }}>
            <p>{category.description}</p>
          </div>
        )}
      </header>
    )
  }

  return (
    <div className="collection-page" style={{ marginBottom: 20 }}>
      {category?.imageUrl && !isSwatch ? (
        <section
          className="collection-banner"
          style={{ backgroundImage: `url(${category.imageUrl})`, height: bannerHeight }}
        >
          <h1 className="collection-banner__title">{collectionTitle}</h1>
        </section>
      ) : (
        <section className="collection-banner collection-banner--plain" style={{ height: 120, minHeight: 120 }}>
          <h1 className="collection-banner__title">{collectionTitle}</h1>
        </section>
      )}

      {showDescription && category?.description && (
        <div className="collection-inner" style={{ paddingTop: 20, paddingBottom: 0 }}>
          <div className="collection-description" style={{ marginBottom: 0 }}>
            <p>{category.description}</p>
          </div>
        </div>
      )}
    </div>
  )
}
