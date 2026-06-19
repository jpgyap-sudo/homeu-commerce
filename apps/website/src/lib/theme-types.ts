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
  | 'newsletter'
  | 'logo_bar'
  | 'testimonial'
  | 'stats_counter'
  | 'blog_posts'
  | 'promo_bar'
  | 'video_hero'
  | 'lookbook'
  | 'category_carousel'
  // Footer sections (global, rendered on every page)
  | 'footer_brand'
  | 'footer_quick_links'
  | 'footer_newsletter'
  | 'footer_social'

export interface HomepageSection {
  id: number
  type: SectionType
  position: number
  enabled: boolean
  config: Record<string, any>
}

/** Human metadata for each section type — drives the admin editor. */
export const SECTION_META: Record<SectionType, { label: string; icon: string; description: string }> = {
  slideshow:         { label: 'Slideshow',            icon: '🖼️', description: 'Rotating hero banners with buttons' },
  brand_text:        { label: 'Brand statement',       icon: '✍️', description: 'Centered heading + paragraph' },
  collection_grid:   { label: 'Shop by Collection',    icon: '🗂️', description: 'Grid of collection tiles' },
  image_with_text:   { label: 'Image with text',       icon: '📰', description: 'Image beside a text block + button' },
  image_bar:         { label: 'Image bar',             icon: '🎞️', description: 'Row of 2–3 images' },
  featured_products: { label: 'Featured pieces',       icon: '⭐', description: 'Product grid (auto or from a collection)' },
  reviews:           { label: 'Reviews',               icon: '💬', description: 'Judge.me review carousel' },
  instagram:         { label: 'Instagram',             icon: '📸', description: 'Instagram feed grid' },
  cta:               { label: 'Call to action',        icon: '📣', description: 'Banner with heading + buttons' },
  newsletter:        { label: 'Newsletter signup',     icon: '✉️', description: 'Email capture form with heading' },
  logo_bar:          { label: 'Logo bar / Partners',   icon: '🏢', description: 'Horizontal row of brand/partner logos' },
  testimonial:       { label: 'Testimonials',          icon: '💬', description: 'Customer quote cards with avatars' },
  stats_counter:     { label: 'Stats counter',         icon: '📊', description: 'Statistics row (numbers + labels)' },
  blog_posts:        { label: 'Blog feed',             icon: '📝', description: 'Recent blog article grid' },
  promo_bar:         { label: 'Promo bar',             icon: '📢', description: 'Sticky announcement bar at top of page' },
  video_hero:        { label: 'Video hero',            icon: '🎬', description: 'Full-screen video banner with overlay' },
  lookbook:          { label: 'Lookbook',              icon: '👗', description: 'Shoppable collage image grid' },
  category_carousel: { label: 'Category carousel',     icon: '🔄', description: 'Horizontal scrolling collection tiles' },
  // Footer sections
  footer_brand:        { label: 'Footer · Brand',       icon: '🏪', description: 'Store name, tagline and address' },
  footer_quick_links:  { label: 'Footer · Quick Links', icon: '🔗', description: 'Navigation link list' },
  footer_newsletter:   { label: 'Footer · Newsletter',  icon: '✉️', description: 'Email signup form' },
  footer_social:       { label: 'Footer · Social',      icon: '📱', description: 'Social media icon links' },
}

export const SECTION_TYPES = Object.keys(SECTION_META) as SectionType[]
