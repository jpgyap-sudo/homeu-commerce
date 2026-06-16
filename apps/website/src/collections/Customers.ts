// Schema definition - kept for reference

import type { CollectionConfig } from '../types/davincios'
import { anyone } from '../access/anyone'
import { adminUsers } from '../access/admin'

export const Customers = {
  slug: 'customers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'phone', 'status', 'createdAt'],
    description: 'Registered customers who can log in to view prices and track RFQs.',
  },
  auth: {
    loginWithUsername: false,
    tokenExpiration: 86400, // 24 hours
    maxLoginAttempts: 5,
    lockTime: 600000, // 10 minutes
    useAPIKey: false,
    cookies: {
      secure: true,
      sameSite: 'Lax',
    },
  },
  access: {
    read: anyone,
    create: anyone,
    update: anyone,
    delete: adminUsers,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Full Name',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      label: 'Email Address',
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      label: 'Contact Number',
    },
    {
      name: 'address',
      type: 'textarea',
      label: 'Delivery Address',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Lead', value: 'lead' },
      ],
      label: 'Customer Status',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'customer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Staff', value: 'staff' },
        { label: 'Customer', value: 'customer' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Admin and staff can manage the backend. Customers only use the storefront account area.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Internal Notes',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'relatedRFQs',
      type: 'relationship',
      relationTo: 'rfq-requests',
      hasMany: true,
      label: 'Related RFQs',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  timestamps: true,
} satisfies CollectionConfig
