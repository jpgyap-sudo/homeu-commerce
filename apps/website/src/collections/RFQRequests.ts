// Schema definition - kept for reference

import type { CollectionConfig } from '../types/davincios'
import { anyone } from '../access/anyone'
import { adminUsers } from '../access/admin'

export const RFQRequests = {
  slug: 'rfq-requests',
  admin: {
    useAsTitle: 'customerName',
    defaultColumns: ['customerName', 'email', 'phone', 'status', 'estimatedTotal', 'createdAt', 'customer'],
    description: 'Request for Quotation submissions. Track from new to contacted, quoted, quotation sent, and closed.',
    listSearchableFields: ['customerName', 'email', 'phone'],
  },
  access: {
    read: anyone,
    create: anyone,
    update: adminUsers,
    delete: adminUsers,
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      label: 'Linked Customer Account',
      admin: {
        position: 'sidebar',
        description: 'Link to registered customer account if the customer was logged in when submitting.',
      },
    },
    { name: 'customerName', type: 'text', required: true, label: 'Customer Name' },
    { name: 'email', type: 'email', label: 'Email Address' },
    { name: 'phone', type: 'text', required: true, label: 'Contact Number' },
    { name: 'deliveryLocation', type: 'text', label: 'Delivery Location' },
    { name: 'projectType', type: 'select', options: ['home', 'condo', 'restaurant', 'hotel', 'office', 'other'], label: 'Project Type' },
    { name: 'notes', type: 'textarea', label: 'Customer Notes' },
    {
      name: 'items',
      type: 'array',
      label: 'Requested Items',
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products' },
        { name: 'productTitleSnapshot', type: 'text', label: 'Product Name' },
        { name: 'skuSnapshot', type: 'text', label: 'SKU' },
        { name: 'unitPriceSnapshot', type: 'number', label: 'Unit Price at RFQ Time' },
        { name: 'quantity', type: 'number', required: true, defaultValue: 1, label: 'Quantity' },
      ],
    },
    { name: 'estimatedTotal', type: 'number', label: 'Estimated Total' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Quoted', value: 'quoted' },
        { label: 'Quotation Sent', value: 'quotation_sent' },
        { label: 'Closed Won', value: 'closed_won' },
        { label: 'Closed Lost', value: 'closed_lost' },
      ],
      label: 'Status',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'quotationSentAt',
      type: 'date',
      label: 'Quotation Sent Date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        condition: (_data: unknown, siblingData: Record<string, unknown>) => {
          return siblingData?.status === 'quotation_sent' || siblingData?.status === 'closed_won' || siblingData?.status === 'closed_lost'
        },
      },
    },
    {
      name: 'quotationSentVia',
      type: 'select',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
        { label: 'In-Person', value: 'in-person' },
      ],
      label: 'Quotation Sent Via',
      admin: {
        position: 'sidebar',
        condition: (_data: unknown, siblingData: Record<string, unknown>) => {
          return siblingData?.status === 'quotation_sent' || siblingData?.status === 'closed_won' || siblingData?.status === 'closed_lost'
        },
      },
    },
    {
      name: 'quotationNotes',
      type: 'textarea',
      label: 'Quotation / Internal Notes',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'closedAt',
      type: 'date',
      label: 'Closed Date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        condition: (_data: unknown, siblingData: Record<string, unknown>) => {
          return siblingData?.status === 'closed_won' || siblingData?.status === 'closed_lost'
        },
      },
    },
    {
      name: 'closedReason',
      type: 'textarea',
      label: 'Closing Notes / Reason',
      admin: {
        position: 'sidebar',
        condition: (_data: unknown, siblingData: Record<string, unknown>) => {
          return siblingData?.status === 'closed_won' || siblingData?.status === 'closed_lost'
        },
      },
    },
  ],
  timestamps: true,
} satisfies CollectionConfig
