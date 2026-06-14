import type { CollectionConfig } from 'payload'

export const RFQRequests = {
  slug: 'rfq-requests',
  admin: { useAsTitle: 'customerName' },
  fields: [
    { name: 'customerName', type: 'text', required: true },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text', required: true },
    { name: 'deliveryLocation', type: 'text' },
    { name: 'projectType', type: 'select', options: ['home', 'condo', 'restaurant', 'hotel', 'office', 'other'] },
    { name: 'notes', type: 'textarea' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products' },
        { name: 'productTitleSnapshot', type: 'text' },
        { name: 'skuSnapshot', type: 'text' },
        { name: 'unitPriceSnapshot', type: 'number' },
        { name: 'quantity', type: 'number', required: true, defaultValue: 1 }
      ]
    },
    { name: 'estimatedTotal', type: 'number' },
    { name: 'status', type: 'select', defaultValue: 'new', options: ['new', 'contacted', 'quoted', 'closed', 'lost'] }
  ]
} satisfies CollectionConfig
