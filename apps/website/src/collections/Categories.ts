// Schema definition - kept for reference

import { generateCategorySeoDescription, generateSeoTitle } from '../lib/seo/generateSeoDescription'
import type { CollectionConfig } from '../types/davincios'
import { anyone } from '../access/anyone'
import { adminUsers } from '../access/admin'

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
      ({ data }: { data: Record<string, unknown> | undefined }) => {
        if (!data) return data
        const title = data.title as string | undefined
        const seoTitle = data.seoTitle as string | undefined
        const seoDescription = data.seoDescription as string | undefined
        if (!seoTitle?.trim() && title) {
          data.seoTitle = generateSeoTitle(title)
        }
        if (!seoDescription?.trim() && title) {
          data.seoDescription = generateCategorySeoDescription(title)
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
