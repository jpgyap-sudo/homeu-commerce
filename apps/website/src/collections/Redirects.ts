// Schema definition - kept for reference

import type { CollectionConfig } from '../types/davincios'
import { anyone } from '../access/anyone'
import { adminUsers } from '../access/admin'

export const Redirects = {
  slug: 'redirects',
  admin: {
    useAsTitle: 'fromPath',
    defaultColumns: ['fromPath', 'toPath', 'redirectType', 'status', 'sourceType'],
    description: 'Old Shopify URLs mapped to new site URLs. Used to set up 301 redirects when the new site goes live, so existing Google rankings and bookmarks keep working.',
  },
  access: {
    read: anyone,
    create: adminUsers,
    update: adminUsers,
    delete: adminUsers,
  },
  fields: [
    { name: 'fromPath', type: 'text', required: true, unique: true, label: 'Old URL path (Shopify)' },
    { name: 'toPath', type: 'text', required: true, label: 'New URL path' },
    {
      name: 'redirectType',
      type: 'select',
      defaultValue: '301',
      options: ['301', '302'],
      label: 'Redirect type',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'active', 'ignored'],
      label: 'Status',
    },
    {
      name: 'sourceType',
      type: 'select',
      defaultValue: 'manual',
      options: ['product', 'category', 'page', 'manual'],
      label: 'Source',
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'medium',
      options: ['high', 'medium', 'low'],
      label: 'SEO priority',
      admin: {
        description: 'How much traffic/ranking this URL carries. Set high for pages with backlinks or steady search traffic.',
        position: 'sidebar',
      },
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Tested on staging',
      admin: {
        description: 'Check once you have confirmed this redirect works (returns 301 to the right page) before going live.',
        position: 'sidebar',
      },
    },
    { name: 'notes', type: 'textarea' },
  ],
} satisfies CollectionConfig
