import type { CollectionConfig } from 'payload'

export const Categories = {
  slug: 'categories',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,       // Public: anyone can view categories
    create: () => false,     // Admin-only via admin panel
    update: () => false,     // Admin-only via admin panel
    delete: () => false,     // Admin-only via admin panel
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
    { name: 'shopifyOriginalUrl', type: 'text' }
  ]
} satisfies CollectionConfig
