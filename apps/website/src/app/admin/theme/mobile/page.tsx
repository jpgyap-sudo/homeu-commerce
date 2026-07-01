'use client'

import NoCodeThemeStudio, { type ThemeFieldSection, type ThemePreset } from '../NoCodeThemeStudio'

const defaults = {
  mobileNavStyle: 'debut',
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
      { key: 'mobileNavStyle', label: 'Mobile experience', type: 'select', help: 'Debut matches homeu.ph exactly — recommended unless you specifically want the tabs experiment.', options: [
        { value: 'debut', label: 'Debut (matches homeu.ph)' },
        { value: 'tabs', label: 'Modern tabs (experimental)' },
      ] },
      { key: 'stickyHeader', label: 'Sticky header', type: 'toggle' },
      { key: 'showSearch', label: 'Show search bar', type: 'toggle' },
    ],
  },
  {
    title: 'Bottom tabs',
    description: 'Only applies in "Modern tabs" mode — Debut mode has no bottom bar, matching homeu.ph',
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
    description: 'Only applies in "Modern tabs" mode — Debut mode shows the real homepage sections, matching homeu.ph',
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
  { label: 'Matches homeu.ph (recommended)', description: 'Debut drawer navigation with the real homepage sections — identical to homeu.ph.', values: { mobileNavStyle: 'debut', showBottomBar: false, showSearch: true, stickyHeader: true, heroStyle: 'minimal' } },
  { label: 'Frictionless mobile (experimental)', description: 'Search, quick actions, categories, and bottom tabs.', values: { mobileNavStyle: 'tabs', showBottomBar: true, bottomBarStyle: 'modern', showSearch: true, quickActionPills: true, categoryChips: true } },
]

const STORE_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.homeatelier.ph'

export default function MobileThemePage() {
  return (
    <NoCodeThemeStudio
      title="Mobile Theme Builder"
      description="Tune the mobile storefront. Debut mode is a 1:1 clone of homeu.ph's mobile experience — the live preview below is the real storefront, not a mockup."
      endpoint="/api/admin/theme/mobile"
      defaults={defaults}
      sections={sections}
      preview="mobile"
      previewLabel="Phone preview"
      presets={presets}
      htmlPreviewConfig={{
        draftEndpoint: '/api/theme/preview-draft',
        buildDraftPayload: settings => ({ mobileTheme: settings, mobileNavStyle: settings.mobileNavStyle }),
        previewUrl: `${STORE_BASE_URL.replace(/\/$/, '')}/?suppressChat=1`,
      }}
    />
  )
}
