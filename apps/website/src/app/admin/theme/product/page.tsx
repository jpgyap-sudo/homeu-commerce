'use client'

import NoCodeThemeStudio, { type ThemeFieldSection, type ThemePreset } from '../NoCodeThemeStudio'

const defaults = {
  showBreadcrumbs: true,
  showSku: true,
  showMaterials: true,
  showDimensions: true,
  galleryWidth: 50,
  layoutGap: 40,
  enableZoom: true,
  buttonText: 'Request Quote',
  columns: 4,
  pageSize: 24,
  gridGap: 36,
  showFilters: true,
  showSort: true,
  showRating: true,
}

const sections: ThemeFieldSection[] = [
  {
    title: 'Product details',
    description: 'Main product page information and buying actions',
    fields: [
      { key: 'buttonText', label: 'Primary RFQ button text', type: 'text', placeholder: 'Request Quote' },
      { key: 'showBreadcrumbs', label: 'Show breadcrumbs', type: 'toggle', help: 'Helps customers understand where they are in the catalog.' },
      { key: 'showSku', label: 'Show SKU', type: 'toggle' },
      { key: 'showMaterials', label: 'Show materials', type: 'toggle' },
      { key: 'showDimensions', label: 'Show dimensions', type: 'toggle' },
      { key: 'enableZoom', label: 'Enable image zoom', type: 'toggle' },
    ],
  },
  {
    title: 'Gallery and layout',
    description: 'Balance product photos and details on desktop',
    fields: [
      { key: 'galleryWidth', label: 'Gallery width', type: 'range', min: 30, max: 70, step: 5, unit: '%' },
      { key: 'layoutGap', label: 'Photo/details spacing', type: 'range', min: 20, max: 80, step: 4, unit: 'px' },
    ],
  },
  {
    title: 'Collection grid',
    description: 'Controls product listing and collection pages',
    fields: [
      { key: 'columns', label: 'Desktop columns', type: 'range', min: 2, max: 5, step: 1 },
      { key: 'pageSize', label: 'Products per page', type: 'range', min: 8, max: 48, step: 4 },
      { key: 'gridGap', label: 'Product card spacing', type: 'range', min: 12, max: 72, step: 4, unit: 'px' },
      { key: 'showFilters', label: 'Show filters', type: 'toggle' },
      { key: 'showSort', label: 'Show sort dropdown', type: 'toggle' },
      { key: 'showRating', label: 'Show reviews and ratings', type: 'toggle' },
    ],
  },
]

const presets: ThemePreset[] = [
  { label: 'Gallery first', description: 'Large photos for visual furniture inspection.', values: { galleryWidth: 60, layoutGap: 48, columns: 3, gridGap: 40 } },
  { label: 'Catalog dense', description: 'More products above the fold for browsing.', values: { galleryWidth: 45, layoutGap: 28, columns: 5, gridGap: 20, pageSize: 36 } },
]

export default function ProductThemePage() {
  return (
    <NoCodeThemeStudio
      title="Product Theme Builder"
      description="Edit product pages and collection grids with plain controls and an immediate preview."
      endpoint="/api/admin/theme/product"
      defaults={defaults}
      sections={sections}
      preview="product"
      previewLabel="Product and collection preview"
      presets={presets}
    />
  )
}
