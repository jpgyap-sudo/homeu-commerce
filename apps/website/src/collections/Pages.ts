import type { CollectionConfig } from 'payload'

export const Pages = {
  slug: 'pages',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,       // Public: anyone can view pages
    create: () => false,     // Admin-only via admin panel
    update: () => false,     // Admin-only via admin panel
    delete: () => false,     // Admin-only via admin panel
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'content', type: 'richText' },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
    { name: 'shopifyOriginalUrl', type: 'text' }
  ]
} satisfies CollectionConfig
