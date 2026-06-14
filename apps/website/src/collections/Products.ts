import type { CollectionConfig } from 'payload'

export const Products = {
  slug: 'products',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,       // Public: anyone can view products
    create: () => false,     // Admin-only via admin panel
    update: () => false,     // Admin-only via admin panel
    delete: () => false,     // Admin-only via admin panel
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'sku', type: 'text' },
    { name: 'price', type: 'number' },
    { name: 'salePrice', type: 'number' },
    { name: 'showPrice', type: 'checkbox', defaultValue: true },
    { name: 'priceNote', type: 'text' },
    { name: 'description', type: 'richText' },
    { name: 'dimensions', type: 'text' },
    { name: 'materials', type: 'text' },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
    { name: 'shopifyOriginalUrl', type: 'text' }
  ]
} satisfies CollectionConfig
