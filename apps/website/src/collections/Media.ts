import type { CollectionConfig } from 'payload'

export const Media = {
  slug: 'media',
  upload: true,
  fields: [
    { name: 'alt', type: 'text' }
  ]
} satisfies CollectionConfig
