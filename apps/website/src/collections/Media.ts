import type { CollectionConfig } from 'payload'

export const Media = {
  slug: 'media',
  upload: true,
  access: {
    read: () => true,       // Public: images must load on frontend
    create: () => false,     // Admin-only via admin panel
    update: () => false,     // Admin-only via admin panel
    delete: () => false,     // Admin-only via admin panel
  },
  fields: [
    { name: 'alt', type: 'text' }
  ]
} satisfies CollectionConfig
