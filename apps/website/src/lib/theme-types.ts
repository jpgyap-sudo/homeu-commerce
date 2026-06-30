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
  | 'product_details'
  | 'collection_header'
  | 'product_grid'
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

export type SectionCategory = 'hero' | 'content' | 'commerce' | 'social' | 'footer'

/** Human metadata for each section type — drives the admin editor. */
export const SECTION_META: Record<SectionType, { label: string; icon: string; description: string; category: SectionCategory }> = {
  slideshow:         { label: 'Slideshow',            icon: '🖼️', description: 'Rotating hero banners with buttons', category: 'hero' },
  video_hero:        { label: 'Video hero',            icon: '🎬', description: 'Full-screen video banner with overlay', category: 'hero' },
  promo_bar:         { label: 'Promo bar',             icon: '📢', description: 'Sticky announcement bar at top of page', category: 'hero' },
  brand_text:        { label: 'Brand statement',       icon: '✍️', description: 'Centered heading + paragraph', category: 'content' },
  image_with_text:   { label: 'Image with text',       icon: '📰', description: 'Image beside a text block + button', category: 'content' },
  image_bar:         { label: 'Image bar',             icon: '🎞️', description: 'Row of 2–3 images', category: 'content' },
  cta:               { label: 'Call to action',        icon: '📣', description: 'Banner with heading + buttons', category: 'content' },
  stats_counter:     { label: 'Stats counter',         icon: '📊', description: 'Statistics row (numbers + labels)', category: 'content' },
  logo_bar:          { label: 'Logo bar / Partners',   icon: '🏢', description: 'Horizontal row of brand/partner logos', category: 'content' },
  lookbook:          { label: 'Lookbook',              icon: '👗', description: 'Shoppable collage image grid', category: 'content' },
  collection_grid:   { label: 'Shop by Collection',    icon: '🗂️', description: 'Grid of collection tiles', category: 'commerce' },
  featured_products: { label: 'Featured pieces',       icon: '⭐', description: 'Product grid (auto or from a collection)', category: 'commerce' },
  category_carousel: { label: 'Category carousel',     icon: '🔄', description: 'Horizontal scrolling collection tiles', category: 'commerce' },
  product_details:   { label: 'Product details',       icon: '📦', description: 'Main product details, gallery, and specs', category: 'commerce' },
  collection_header: { label: 'Collection header',     icon: '🏷️', description: 'Collection banner/title and description', category: 'commerce' },
  product_grid:      { label: 'Product grid',          icon: '📱', description: 'Grid of collection products with filters', category: 'commerce' },
  newsletter:        { label: 'Newsletter signup',     icon: '✉️', description: 'Email capture form with heading', category: 'social' },
  testimonial:       { label: 'Testimonials',          icon: '💬', description: 'Customer quote cards with avatars', category: 'social' },
  reviews:           { label: 'Reviews',               icon: '💬', description: 'Judge.me review carousel', category: 'social' },
  instagram:         { label: 'Instagram',             icon: '📸', description: 'Instagram feed grid', category: 'social' },
  blog_posts:        { label: 'Blog feed',             icon: '📝', description: 'Recent blog article grid', category: 'social' },
  // Footer sections
  footer_brand:        { label: 'Footer · Brand',       icon: '🏪', description: 'Store name, tagline and address', category: 'footer' },
  footer_quick_links:  { label: 'Footer · Quick Links', icon: '🔗', description: 'Navigation link list', category: 'footer' },
  footer_newsletter:   { label: 'Footer · Newsletter',  icon: '✉️', description: 'Email signup form', category: 'footer' },
  footer_social:       { label: 'Footer · Social',      icon: '📱', description: 'Social media icon links', category: 'footer' },
}

export const SECTION_TYPES = Object.keys(SECTION_META) as SectionType[]
