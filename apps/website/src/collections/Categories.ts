import type { CollectionConfig } from 'DaVinciOS'
import { adminUsers, anyone } from '../access/admin'
import { generateCategorySeoDescription, generateSeoTitle } from '../lib/seo/generateSeoDescription'

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
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.seoTitle?.trim() && data.title) {
          data.seoTitle = generateSeoTitle(data.title)
        }
        if (!data.seoDescription?.trim() && data.title) {
          data.seoDescription = generateCategorySeoDescription(data.title)
        }
        return data
      },
    ],
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
