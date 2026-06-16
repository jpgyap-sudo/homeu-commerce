// Schema definition - kept for reference

import type { CollectionConfig } from '../types/davincios'
import { anyone } from '../access/anyone'
import { adminUsers } from '../access/admin'

export const Quotations = {
  slug: 'quotations',
  admin: {
    useAsTitle: 'quotationNumber',
    defaultColumns: ['quotationNumber', 'customerName', 'grandTotal', 'status', 'validUntil', 'createdAt'],
    description: 'Formal quotations generated from RFQs or created manually. Includes itemised pricing, discounts, and terms.',
    listSearchableFields: ['quotationNumber', 'customerName', 'email'],
  },
  access: {
    read: anyone,
    create: adminUsers,
    update: adminUsers,
    delete: adminUsers,
  },
  fields: [
    // ── Identity & Linking ──
    {
      name: 'quotationNumber',
      type: 'text',
      required: true,
      unique: true,
      label: 'Quotation #',
      admin: {
        description: 'Auto-generated or manually assigned quotation reference (e.g. Q-2024-0001).',
      },
    },
    {
      name: 'rfq',
      type: 'relationship',
      relationTo: 'rfq-requests',
      label: 'Source RFQ',
      admin: {
        position: 'sidebar',
        description: 'Link to the RFQ request that triggered this quotation (optional).',
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      label: 'Linked Customer Account',
      admin: {
        position: 'sidebar',
        description: 'Link to registered customer account.',
      },
    },

    // ── Client Information ──
    {
      name: 'customerName',
      type: 'text',
      required: true,
      label: 'Customer Name',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email Address',
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      label: 'Contact Number',
    },
    {
      name: 'deliveryLocation',
      type: 'text',
      label: 'Delivery Location',
    },
    {
      name: 'projectType',
      type: 'select',
      options: ['home', 'condo', 'restaurant', 'hotel', 'office', 'other'],
      label: 'Project Type',
    },

    // ── Items Table ──
    {
      name: 'items',
      type: 'array',
      label: 'Quotation Items',
      fields: [
        {
          name: 'itemNumber',
          type: 'number',
          label: 'Item #',
          defaultValue: 1,
        },
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          label: 'Product',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Item Image',
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Description',
          admin: {
            description: 'Full description including material, dimensions, and color.',
          },
        },
        {
          name: 'material',
          type: 'text',
          label: 'Material',
        },
        {
          name: 'dimensions',
          type: 'text',
          label: 'Dimensions',
        },
        {
          name: 'color',
          type: 'text',
          label: 'Color / Finish',
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          defaultValue: 1,
          label: 'QTY',
        },
        {
          name: 'unitCost',
          type: 'number',
          required: true,
          label: 'Unit Cost (₱)',
        },
        {
          name: 'discountPercent',
          type: 'number',
          defaultValue: 0,
          label: 'Disc %',
          admin: {
            description: 'Discount percentage applied to this item (e.g. 10 for 10%).',
          },
        },
        {
          name: 'discountedCost',
          type: 'number',
          label: 'Disc Cost (₱)',
          admin: {
            description: 'Unit cost after discount. Computed as Unit Cost × (1 − Disc%/100).',
            readOnly: true,
          },
        },
        {
          name: 'total',
          type: 'number',
          label: 'Total (₱)',
          admin: {
            description: 'Line total. Computed as Disc Cost × QTY.',
            readOnly: true,
          },
        },
      ],
    },

    // ── Cost Summary ──
    {
      name: 'subtotal',
      type: 'number',
      label: 'Subtotal (₱)',
      admin: {
        position: 'sidebar',
        description: 'Sum of all item totals before additional fees.',
      },
    },
    {
      name: 'shippingCost',
      type: 'number',
      defaultValue: 0,
      label: 'Shipping / Handling (₱)',
      admin: {
        position: 'sidebar',
        description: 'Transportation, packaging, and handling costs.',
      },
    },
    {
      name: 'grandTotal',
      type: 'number',
      label: 'Grand Total (₱)',
      admin: {
        position: 'sidebar',
        description: 'Subtotal + Shipping.',
      },
    },

    // ── Validity ──
    {
      name: 'validUntil',
      type: 'date',
      label: 'Valid Until',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },

    // ── Terms & Conditions ──
    {
      name: 'termsDeliveryLeadtime',
      type: 'text',
      label: 'Delivery Leadtime',
      defaultValue: 'Please allow 2–4 weeks for manufacturing and delivery depending on availability.',
    },
    {
      name: 'termsPaymentTerms',
      type: 'textarea',
      label: 'Payment Terms',
      defaultValue: '50% down payment upon order confirmation. Remaining 50% due before delivery.',
    },
    {
      name: 'termsWarranty',
      type: 'textarea',
      label: 'Warranty',
      defaultValue: 'All furniture pieces come with a standard manufacturer warranty covering manufacturing defects.',
    },
    {
      name: 'termsBankDetails',
      type: 'textarea',
      label: 'Bank Details',
      defaultValue: 'Bank: Eastwest Bank\nAccount Name: Home Atelier\nAccount Number: ________________',
    },
    {
      name: 'termsCancellationPolicy',
      type: 'textarea',
      label: 'Cancellation Policy',
      defaultValue: 'Cancellations made within 24 hours of order confirmation are fully refundable. After 24 hours, a cancellation fee may apply.',
    },
    {
      name: 'termsReturnPolicy',
      type: 'textarea',
      label: 'Return Policy',
      defaultValue: 'Items may be returned within 7 days of delivery subject to inspection and approval.',
    },
    {
      name: 'termsRejectionOfItems',
      type: 'textarea',
      label: 'Rejection of Items',
      defaultValue: 'Any damage or discrepancy must be reported within 24 hours of delivery. Photos may be required for assessment.',
    },
    {
      name: 'termsRefundPolicy',
      type: 'textarea',
      label: 'Refund Policy',
      defaultValue: 'Refunds will be processed within 14 business days after item(s) are returned and inspected.',
    },

    // ── Status & Tracking ──
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sent', value: 'sent' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      label: 'Status',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Sent Date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        condition: (_: unknown, siblingData: Record<string, unknown>) => siblingData?.status === 'sent' || siblingData?.status === 'accepted' || siblingData?.status === 'rejected',
      },
    },
    {
      name: 'sentVia',
      type: 'select',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
        { label: 'In-Person', value: 'in-person' },
      ],
      label: 'Sent Via',
      admin: {
        position: 'sidebar',
        condition: (_: unknown, siblingData: Record<string, unknown>) => siblingData?.status === 'sent' || siblingData?.status === 'accepted' || siblingData?.status === 'rejected',
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      label: 'Internal Notes',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
} satisfies CollectionConfig
