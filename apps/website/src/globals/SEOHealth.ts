import type { GlobalConfig } from 'DaVinciOS'
import { adminUsers } from '../access/admin'

export const SEOHealth = {
  slug: 'seo-health',
  label: 'SEO Migration Health',
  admin: {
    description:
      'Auto-generated report card for the Shopify -> new site migration. Shows whether content moved over without hurting SEO, and what is still left to do before launch. Regenerate from tools/shopify-import/seo-audit.mjs.',
  },
  access: {
    read: adminUsers,
    update: adminUsers,
  },
  fields: [
    {
      name: 'score',
      type: 'number',
      label: 'Overall SEO migration score (0-100)',
      admin: { position: 'sidebar' },
    },
    {
      name: 'grade',
      type: 'select',
      options: ['A', 'B', 'C', 'D', 'F'],
      label: 'Grade',
      admin: { position: 'sidebar' },
    },
    {
      name: 'lastAuditAt',
      type: 'date',
      label: 'Last audited',
      admin: { position: 'sidebar', date: { displayFormat: 'yyyy-MM-dd HH:mm' } },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Summary',
    },
    {
      name: 'totals',
      type: 'group',
      label: 'Records audited',
      fields: [
        { name: 'products', type: 'number' },
        { name: 'categories', type: 'number' },
        { name: 'pages', type: 'number' },
      ],
    },
    {
      name: 'checks',
      type: 'array',
      label: 'Checklist',
      labels: { singular: 'Check', plural: 'Checks' },
      admin: {
        description: 'Each migration safety check, its pass rate, and SEO impact if not fixed.',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'passed', type: 'number', required: true },
        { name: 'total', type: 'number', required: true },
        {
          name: 'impact',
          type: 'select',
          options: ['high', 'medium', 'low'],
          defaultValue: 'medium',
        },
        { name: 'description', type: 'textarea' },
      ],
    },
    {
      name: 'redirectsSummary',
      type: 'group',
      label: 'Redirects',
      fields: [
        { name: 'total', type: 'number' },
        { name: 'pending', type: 'number' },
        { name: 'active', type: 'number' },
        { name: 'verified', type: 'number' },
      ],
    },
    {
      name: 'recommendations',
      type: 'array',
      label: 'Recommended next steps',
      fields: [
        { name: 'text', type: 'text', required: true },
        {
          name: 'priority',
          type: 'select',
          options: ['high', 'medium', 'low'],
          defaultValue: 'medium',
        },
      ],
    },
  ],
} satisfies GlobalConfig
