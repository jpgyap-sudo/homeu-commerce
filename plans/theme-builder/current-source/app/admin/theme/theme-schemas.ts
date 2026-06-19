/**
 * Field schemas that drive the Theme editor forms.
 *
 * To add an editable field to a section, add an entry here — the admin form
 * renders automatically. To add a whole new section type: add a renderer in
 * components/home/HomeSections.tsx, register it in lib/theme.ts SECTION_META,
 * and add its fields here.
 */

export type FieldType = 'text' | 'textarea' | 'url' | 'number' | 'color' | 'list'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  help?: string
  // For 'list' fields: the shape of each item
  itemFields?: { key: string; label: string; type: FieldType; placeholder?: string }[]
}

export const SECTION_SCHEMAS: Record<string, FieldDef[]> = {
  slideshow: [
    {
      key: 'slides', label: 'Slides', type: 'list',
      itemFields: [
        { key: 'image', label: 'Image URL', type: 'url' },
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'subheading', label: 'Subheading', type: 'text' },
        { key: 'buttonText', label: 'Button text', type: 'text' },
        { key: 'buttonLink', label: 'Button link', type: 'text' },
      ],
    },
  ],
  brand_text: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
  ],
  collection_grid: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'source', label: 'Source (featured | all)', type: 'text', help: '"featured" shows only collections marked ★ Featured; "all" shows any with an image.' },
    { key: 'limit', label: 'Max tiles', type: 'number' },
  ],
  image_with_text: [
    { key: 'image', label: 'Image URL', type: 'url' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'text', label: 'Text', type: 'textarea' },
    { key: 'buttonText', label: 'Button text', type: 'text' },
    { key: 'buttonLink', label: 'Button link', type: 'text' },
  ],
  image_bar: [
    {
      key: 'images', label: 'Images', type: 'list',
      itemFields: [
        { key: 'image', label: 'Image URL', type: 'url' },
        { key: 'link', label: 'Link (optional)', type: 'text' },
      ],
    },
  ],
  featured_products: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'source', label: 'Source (auto | collection)', type: 'text', help: '"auto" = newest products; "collection" = pull from the collection slug below.' },
    { key: 'collectionSlug', label: 'Collection slug', type: 'text', placeholder: 'e.g. lighting-1' },
    { key: 'limit', label: 'Max products', type: 'number' },
  ],
  reviews: [
    { key: 'heading', label: 'Heading', type: 'text' },
  ],
  instagram: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'handle', label: 'Instagram handle', type: 'text', placeholder: 'homeatelierph' },
    { key: 'tiles', label: 'Number of tiles', type: 'number' },
  ],
  cta: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'text', label: 'Text', type: 'textarea' },
    { key: 'bgColor', label: 'Background color', type: 'color', help: 'Leave empty for default' },
    { key: 'primaryText', label: 'Primary button text', type: 'text' },
    { key: 'primaryLink', label: 'Primary button link', type: 'text' },
    { key: 'secondaryText', label: 'Secondary button text', type: 'text' },
    { key: 'secondaryLink', label: 'Secondary button link', type: 'text' },
  ],

  newsletter: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Join our mailing list' },
    { key: 'subtext', label: 'Subtext', type: 'textarea', placeholder: 'Be the first to know about new arrivals, sales & exclusive offers.' },
    { key: 'placeholder', label: 'Input placeholder', type: 'text', placeholder: 'Enter your email' },
    { key: 'buttonText', label: 'Button text', type: 'text', placeholder: 'Subscribe' },
    { key: 'bgColor', label: 'Background color', type: 'color', help: 'Leave empty for default' },
    { key: 'successMessage', label: 'Success message', type: 'text', placeholder: 'Thanks for subscribing!' },
  ],

  logo_bar: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'As Seen In' },
    {
      key: 'logos', label: 'Logos', type: 'list',
      itemFields: [
        { key: 'image', label: 'Logo image URL', type: 'url' },
        { key: 'link', label: 'Link (optional)', type: 'text' },
        { key: 'alt', label: 'Alt text', type: 'text' },
      ],
    },
  ],

  testimonial: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'What Our Customers Say' },
    {
      key: 'testimonials', label: 'Testimonials', type: 'list',
      itemFields: [
        { key: 'quote', label: 'Quote', type: 'textarea' },
        { key: 'author', label: 'Author name', type: 'text' },
        { key: 'role', label: 'Role / title', type: 'text' },
        { key: 'avatar', label: 'Avatar image URL', type: 'url' },
      ],
    },
  ],

  stats_counter: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'By the Numbers' },
    {
      key: 'stats', label: 'Statistics', type: 'list',
      itemFields: [
        { key: 'number', label: 'Number', type: 'text', placeholder: '10,000+' },
        { key: 'label', label: 'Label', type: 'text', placeholder: 'Happy Customers' },
        { key: 'prefix', label: 'Prefix icon/emoji', type: 'text', placeholder: '⭐' },
      ],
    },
  ],

  blog_posts: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'From Our Journal' },
    { key: 'limit', label: 'Number of posts', type: 'number', help: 'Max articles to show (default: 4)' },
    { key: 'layout', label: 'Layout', type: 'text', placeholder: 'grid (grid | list)', help: '"grid" for card grid, "list" for stacked layout' },
  ],

  promo_bar: [
    { key: 'text', label: 'Announcement text', type: 'text', placeholder: 'Free shipping on orders over ₱5,000' },
    { key: 'link', label: 'Link (optional)', type: 'text', help: 'Where the bar links to when clicked' },
    { key: 'bgColor', label: 'Background color', type: 'color' },
    { key: 'textColor', label: 'Text color', type: 'color' },
  ],

  video_hero: [
    { key: 'videoUrl', label: 'Video URL (MP4)', type: 'url', placeholder: 'https://example.com/hero.mp4' },
    { key: 'posterImage', label: 'Poster/fallback image', type: 'url', help: 'Shown while video loads or on mobile' },
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Welcome to Home Atelier' },
    { key: 'subheading', label: 'Subheading', type: 'text' },
    { key: 'buttonText', label: 'Button text', type: 'text' },
    { key: 'buttonLink', label: 'Button link', type: 'text' },
    { key: 'overlayColor', label: 'Overlay color', type: 'color', help: 'Semi-transparent overlay on top of video' },
  ],

  lookbook: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Our Collection' },
    {
      key: 'items', label: 'Lookbook items', type: 'list',
      itemFields: [
        { key: 'image', label: 'Image URL', type: 'url' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'link', label: 'Product link', type: 'text' },
        { key: 'colSpan', label: 'Column span (1-3)', type: 'text', placeholder: '2' },
        { key: 'rowSpan', label: 'Row span (1-3)', type: 'text', placeholder: '1' },
      ],
    },
  ],

  category_carousel: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Shop by Category' },
    { key: 'source', label: 'Source (featured | all)', type: 'text', help: '"featured" shows only ★ Featured collections; "all" shows published with images' },
    { key: 'limit', label: 'Max items', type: 'number' },
  ],
}
