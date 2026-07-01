'use client'

import NoCodeThemeStudio, { type ThemeFieldSection, type ThemePreset } from '../NoCodeThemeStudio'

const defaults = {
  template: 'modern',
  brandColor: '#1a6d3e',
  accentColor: '#b88935',
  fontFamily: 'Inter, sans-serif',
  headerLogo: '',
  showHeaderLogo: true,
  showCompanyName: true,
  showAddress: true,
  showItemImages: true,
  showUnitPrice: true,
  showTerms: true,
  termsText: 'This quotation is valid for 15 days from the date of issue. Prices are subject to change without prior notice.',
  footerText: 'Thank you for choosing Home Atelier',
  showPageNumbers: true,
  showWatermark: false,
  watermarkText: 'DRAFT',
}

const sections: ThemeFieldSection[] = [
  {
    title: 'Document style',
    description: 'Quotation PDF layout and brand expression',
    fields: [
      { key: 'template', label: 'Template', type: 'select', options: [
        { value: 'modern', label: 'Modern' },
        { value: 'classic', label: 'Classic' },
        { value: 'minimal', label: 'Minimal' },
      ] },
      { key: 'fontFamily', label: 'PDF font', type: 'select', options: [
        { value: 'Inter, sans-serif', label: 'Inter' },
        { value: 'Georgia, serif', label: 'Georgia' },
        { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
        { value: 'Times New Roman, serif', label: 'Times New Roman' },
      ] },
      { key: 'brandColor', label: 'Brand color', type: 'color' },
      { key: 'accentColor', label: 'Accent color', type: 'color' },
    ],
  },
  {
    title: 'Header',
    description: 'Company identity shown at the top',
    fields: [
      { key: 'showHeaderLogo', label: 'Show company logo', type: 'toggle' },
      { key: 'headerLogo', label: 'Logo image', type: 'image', help: 'Falls back to the default Home Atelier logo if left empty.' },
      { key: 'showCompanyName', label: 'Show company name', type: 'toggle' },
      { key: 'showAddress', label: 'Show address', type: 'toggle' },
    ],
  },
  {
    title: 'Line items',
    description: 'What the itemized table on the PDF shows',
    fields: [
      { key: 'showItemImages', label: 'Show product images', type: 'toggle' },
      { key: 'showUnitPrice', label: 'Show unit price column', type: 'toggle', help: 'Turn off to show only the line total, not per-unit cost.' },
    ],
  },
  {
    title: 'Terms and footer',
    description: 'Reusable text staff can edit',
    fields: [
      { key: 'showTerms', label: 'Show terms', type: 'toggle' },
      {
        key: 'termsText',
        label: 'Terms text',
        type: 'textarea',
        rows: 5,
        help: 'Pick a preset to start from, then edit freely.',
        textPresets: [
          {
            label: 'Standard (15 days)',
            value: 'This quotation is valid for 15 days from the date of issue. Prices are subject to change without prior notice.',
          },
          {
            label: '50% downpayment',
            value: 'This quotation is valid for 15 days from the date of issue. A 50% downpayment is required to confirm the order, with the balance due prior to delivery. Prices are subject to change without prior notice.',
          },
          {
            label: 'Custom order / non-refundable',
            value: 'This quotation is valid for 15 days from the date of issue. Custom and made-to-order items require full payment upfront and are non-refundable once production has started. Lead times are estimates and may vary.',
          },
          {
            label: 'Delivery lead-time disclaimer',
            value: 'This quotation is valid for 15 days from the date of issue. Delivery lead times are estimates only and may be affected by supplier availability, customization, and logistics. Prices are subject to change without prior notice.',
          },
        ],
      },
      { key: 'footerText', label: 'Footer text', type: 'text' },
      { key: 'showPageNumbers', label: 'Show page numbers', type: 'toggle' },
    ],
  },
  {
    title: 'Watermark',
    description: 'Draft and internal quotation states',
    fields: [
      { key: 'showWatermark', label: 'Show watermark', type: 'toggle' },
      { key: 'watermarkText', label: 'Watermark text', type: 'text', placeholder: 'DRAFT' },
    ],
  },
]

const presets: ThemePreset[] = [
  { label: 'Sales ready', description: 'Clean modern quotation for customer approval.', values: { template: 'modern', showWatermark: false, showTerms: true } },
  { label: 'Draft review', description: 'Internal draft with watermark visible.', values: { template: 'classic', showWatermark: true, watermarkText: 'DRAFT' } },
]

export default function QuotationThemePage() {
  return (
    <NoCodeThemeStudio
      title="Quotation Theme Builder"
      description="Edit the customer-facing quotation PDF template with live document preview."
      endpoint="/api/admin/theme/quotation"
      defaults={defaults}
      sections={sections}
      preview="quotation"
      previewLabel="Quotation PDF preview"
      presets={presets}
    />
  )
}
