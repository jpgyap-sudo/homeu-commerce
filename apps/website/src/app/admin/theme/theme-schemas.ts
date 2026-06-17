/**
 * Field schemas that drive the Theme editor forms.
 *
 * To add an editable field to a section, add an entry here — the admin form
 * renders automatically. To add a whole new section type: add a renderer in
 * components/home/HomeSections.tsx, register it in lib/theme.ts SECTION_META,
 * and add its fields here.
 */

export type FieldType = 'text' | 'textarea' | 'url' | 'number' | 'list'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  help?: string
  // For 'list' fields: the shape of each item
  itemFields?: { key: string; label: string; type: FieldType }[]
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
    { key: 'primaryText', label: 'Primary button text', type: 'text' },
    { key: 'primaryLink', label: 'Primary button link', type: 'text' },
    { key: 'secondaryText', label: 'Secondary button text', type: 'text' },
    { key: 'secondaryLink', label: 'Secondary button link', type: 'text' },
  ],
}
