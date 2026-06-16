// Schema definition - kept for reference

import type { CollectionConfig } from '../types/davincios'
import { anyone } from '../access/anyone'
import { adminUsers } from '../access/admin'

export const Pages = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    description: 'Editorial and SEO pages for HomeU content outside the product catalog.',
    listSearchableFields: ['title', 'slug', 'seoTitle'],
  },
  access: {
    read: anyone,
    create: adminUsers,
    update: adminUsers,
    delete: adminUsers,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'content', type: 'richText' },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
    {
      name: 'shopifyOriginalUrl',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Legacy Shopify page URL for redirect mapping.',
      },
    }
  ]
} satisfies CollectionConfig
