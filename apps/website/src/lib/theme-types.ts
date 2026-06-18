/**
 * Theme types and constants — safe for client components.
 * No database imports here.
 */

export type SectionType =
  | 'slideshow'
  | 'brand_text'
  | 'collection_grid'
  | 'image_with_text'
  | 'image_bar'
  | 'featured_products'
  | 'reviews'
  | 'instagram'
  | 'cta'

export interface HomepageSection {
  id: number
  type: SectionType
  position: number
  enabled: boolean
  config: Record<string, any>
}

/** Human metadata for each section type — drives the admin editor. */
export const SECTION_META: Record<SectionType, { label: string; icon: string; description: string }> = {
  slideshow:         { label: 'Slideshow',          icon: '🖼️', description: 'Rotating hero banners with buttons' },
  brand_text:        { label: 'Brand statement',     icon: '✍️', description: 'Centered heading + paragraph' },
  collection_grid:   { label: 'Shop by Collection',  icon: '🗂️', description: 'Grid of collection tiles' },
  image_with_text:   { label: 'Image with text',     icon: '📰', description: 'Image beside a text block + button' },
  image_bar:         { label: 'Image bar',           icon: '🎞️', description: 'Row of 2–3 images' },
  featured_products: { label: 'Featured pieces',     icon: '⭐', description: 'Product grid (auto or from a collection)' },
  reviews:           { label: 'Reviews',             icon: '💬', description: 'Judge.me review carousel' },
  instagram:         { label: 'Instagram',           icon: '📸', description: 'Instagram feed grid' },
  cta:               { label: 'Call to action',      icon: '📣', description: 'Banner with heading + buttons' },
}

export const SECTION_TYPES = Object.keys(SECTION_META) as SectionType[]
