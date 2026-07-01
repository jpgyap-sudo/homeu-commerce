'use client'

import NoCodeThemeStudio, { type ThemeFieldSection, type ThemePreset } from '../NoCodeThemeStudio'

const defaults = {
  mobileNavStyle: 'tabs',
  showBottomBar: true,
  bottomBarStyle: 'modern',
  showSearch: true,
  heroStyle: 'default',
  quickActionPills: true,
  categoryChips: true,
  stickyHeader: true,
}

const sections: ThemeFieldSection[] = [
  {
    title: 'Navigation',
    description: 'Mobile header and primary navigation',
    fields: [
      { key: 'mobileNavStyle', label: 'Mobile experience', type: 'select', options: [
        { value: 'tabs', label: 'Modern tabs' },
        { value: 'debut', label: 'Debut drawer' },
      ] },
      { key: 'stickyHeader', label: 'Sticky header', type: 'toggle' },
      { key: 'showSearch', label: 'Show search bar', type: 'toggle' },
    ],
  },
  {
    title: 'Bottom tabs',
    description: 'Phone navigation for repeat shoppers',
    fields: [
      { key: 'showBottomBar', label: 'Show bottom tab bar', type: 'toggle' },
      { key: 'bottomBarStyle', label: 'Bottom bar style', type: 'select', options: [
        { value: 'modern', label: 'Floating modern' },
        { value: 'classic', label: 'Classic fixed' },
      ] },
    ],
  },
  {
    title: 'Mobile homepage',
    description: 'First screen for phone visitors',
    fields: [
      { key: 'heroStyle', label: 'Hero style', type: 'select', options: [
        { value: 'default', label: 'Hero with quick actions' },
        { value: 'minimal', label: 'Minimal catalog-first' },
      ] },
      { key: 'quickActionPills', label: 'Show quick action pills', type: 'toggle' },
      { key: 'categoryChips', label: 'Show category chips', type: 'toggle' },
    ],
  },
]

const presets: ThemePreset[] = [
  { label: 'Frictionless mobile', description: 'Search, quick actions, categories, and bottom tabs.', values: { mobileNavStyle: 'tabs', showBottomBar: true, bottomBarStyle: 'modern', showSearch: true, quickActionPills: true, categoryChips: true } },
  { label: 'Shopify Debut style', description: 'Classic drawer navigation with real homepage sections.', values: { mobileNavStyle: 'debut', showBottomBar: false, showSearch: true, heroStyle: 'minimal' } },
]

export default function MobileThemePage() {
  return (
    <NoCodeThemeStudio
      title="Mobile Theme Builder"
      description="Tune the mobile storefront for regular shoppers: search, quick actions, categories, and RFQ access."
      endpoint="/api/admin/theme/mobile"
      defaults={defaults}
      sections={sections}
      preview="mobile"
      previewLabel="Phone preview"
      presets={presets}
    />
  )
}
