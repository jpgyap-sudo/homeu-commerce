'use client'

interface Category {
  title: string
  slug: string
  imageUrl?: string | null
  bannerImageUrl?: string | null
  bannerFocalX?: number | null
  bannerFocalY?: number | null
  bannerImageScale?: number | null
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
  const bannerHeight = config.bannerHeight || 260
  const overlayOpacity = config.overlayOpacity !== undefined ? config.overlayOpacity : 30
  const textColor = config.textColor || '#ffffff'
  const spacingTop = config.spacingTop !== undefined ? config.spacingTop : 16
  const spacingBottom = config.spacingBottom !== undefined ? config.spacingBottom : 0

  const collectionTitle = category?.title || 'Our Products'
  const isSwatch = category?.slug ? SWATCH_CATEGORY_SLUGS.has(category.slug) : false
  const bannerImage = category?.bannerImageUrl || category?.imageUrl || ''
  const focalX = Math.min(100, Math.max(0, Number(category?.bannerFocalX ?? 50)))
  const focalY = Math.min(100, Math.max(0, Number(category?.bannerFocalY ?? 50)))
  const imageScale = Math.min(160, Math.max(40, Number(category?.bannerImageScale ?? 100)))

  if (!showBanner) {
    return (
      <header className="page-width" style={{ paddingTop: spacingTop, paddingBottom: spacingBottom }}>
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
    <div className="collection-page" style={{ marginTop: spacingTop, marginBottom: spacingBottom }}>
      {bannerImage && !isSwatch ? (
        <section
          className="collection-banner"
          style={{
            backgroundImage: `url(${bannerImage})`,
            backgroundPosition: `${focalX}% ${focalY}%`,
            backgroundSize: imageScale === 100 ? 'cover' : `${imageScale}% auto`,
            height: bannerHeight,
          }}
        >
          <div className="collection-banner__overlay" style={{
            background: `rgba(0, 0, 0, ${overlayOpacity / 100})`,
            mixBlendMode: 'normal'
          }} />
          <h1 className="collection-banner__title" style={{ color: textColor }}>{collectionTitle}</h1>
        </section>
      ) : (
        <section className="collection-banner collection-banner--plain" style={{ height: 120, minHeight: 120 }}>
          <h1 className="collection-banner__title">{collectionTitle}</h1>
        </section>
      )}

      {showDescription && category?.description && (
        <div className="collection-inner" style={{ paddingTop: 24, paddingBottom: 0 }}>
          <div className="collection-description" style={{ marginTop: 0, marginBottom: 0 }}>
            <p>{category.description}</p>
          </div>
        </div>
      )}
    </div>
  )
}
