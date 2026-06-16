// Schema definition - kept for reference

import type { CollectionConfig } from '../types/davincios'
import { anyone } from '../access/anyone'
import { adminUsers } from '../access/admin'

export const Media = {
  slug: 'media',
  upload: true,
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt'],
    description: 'Product, category, and content media used across the storefront.',
  },
  access: {
    read: anyone,
    create: adminUsers,
    update: adminUsers,
    delete: adminUsers,
  },
  fields: [
    { name: 'alt', type: 'text' }
  ]
} satisfies CollectionConfig
