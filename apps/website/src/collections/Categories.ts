import type { CollectionConfig } from 'DaVinciOS'
import { adminUsers, anyone } from '../access/admin'

export const Categories = {
  slug: 'categories',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    description: 'Storefront catalog groupings for browsing, SEO landing pages, and product organization.',
    listSearchableFields: ['title', 'slug'],
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
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
    {
      name: 'shopifyOriginalUrl',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Legacy Shopify category URL for redirect mapping.',
      },
    }
  ]
} satisfies CollectionConfig
