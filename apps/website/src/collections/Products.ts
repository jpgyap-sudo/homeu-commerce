import type { CollectionConfig } from '@davincios/cms'
import { adminUsers, anyone } from '../access/admin'
import { generateProductSeoDescription, generateSeoTitle } from '../lib/seo/generateSeoDescription'
import { extractPlainText } from '../lib/seo/extractPlainText'

export const Products = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'sku', 'inventoryQuantity', 'category', 'productType', 'vendor'],
    description: 'Catalog items shown on the storefront. Keep pricing, images, dimensions, and SEO ready for RFQ shoppers.',
    listSearchableFields: ['title', 'sku', 'slug', 'materials'],
  },
  access: {
    read: anyone,
    create: adminUsers,
    update: adminUsers,
    delete: adminUsers,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data || !data.title) return data

        if (!data.seoTitle?.trim()) {
          data.seoTitle = generateSeoTitle(data.title)
        }

        if (!data.seoDescription?.trim()) {
          let categoryTitle: string | undefined
          if (data.category) {
            const categoryId = typeof data.category === 'object' ? data.category?.id : data.category
            if (categoryId) {
              try {
                const category = await req.DaVinciOS.findByID({
                  collection: 'categories',
                  id: categoryId,
                  depth: 0,
                })
                categoryTitle = category?.title
              } catch {
                // category lookup is best-effort; fall back without it
              }
            }
          }

          data.seoDescription = generateProductSeoDescription({
            title: data.title,
            description: extractPlainText(data.description),
            categoryTitle,
          })
        }

        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'sku', type: 'text' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Draft', value: 'draft' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    { name: 'vendor', type: 'text', defaultValue: 'HOMEU.PH' },
    { name: 'productType', type: 'text', label: 'Product Type' },
    { name: 'price', type: 'number' },
    { name: 'salePrice', type: 'number' },
    { name: 'showPrice', type: 'checkbox', defaultValue: true },
    { name: 'priceNote', type: 'text' },
    {
      name: 'inventoryTracked',
      type: 'checkbox',
      defaultValue: false,
      label: 'Track Inventory',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'inventoryQuantity',
      type: 'number',
      defaultValue: 0,
      label: 'Inventory',
      admin: {
        position: 'sidebar',
        condition: (_, siblingData) => siblingData?.inventoryTracked === true,
      },
    },
    {
      name: 'salesChannel',
      type: 'select',
      defaultValue: 'online-store',
      options: [
        { label: 'Online Store', value: 'online-store' },
        { label: 'RFQ Catalog', value: 'rfq-catalog' },
        { label: 'Admin Draft', value: 'admin-draft' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    { name: 'description', type: 'richText' },
    { name: 'dimensions', type: 'text' },
    { name: 'materials', type: 'text' },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    {
      name: 'seoTitle',
      type: 'text',
      admin: {
        description: 'Search result title. Keep it specific to the product and HomeU.',
      },
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      admin: {
        description: 'Short search result summary for category and product discovery.',
      },
    },
    {
      name: 'shopifyOriginalUrl',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Legacy Shopify URL used for redirects and migration checks.',
      },
    }
  ]
} satisfies CollectionConfig
