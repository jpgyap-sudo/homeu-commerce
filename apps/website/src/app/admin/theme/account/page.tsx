'use client'

import { DEFAULT_CUSTOMER_ACCOUNT_THEME } from '@/lib/customer-account-theme'
import NoCodeThemeStudio, { type ThemeFieldSection, type ThemePreset } from '../NoCodeThemeStudio'

const sections: ThemeFieldSection[] = [
  {
    title: 'Layout',
    description: 'Choose how the customer portal feels',
    fields: [
      { key: 'welcomeLabel', label: 'Portal label', type: 'text', placeholder: 'My HomeU' },
      { key: 'layout', label: 'Dashboard layout', type: 'select', options: [
        { value: 'concierge', label: 'Concierge' },
        { value: 'classic', label: 'Classic' },
      ] },
      { key: 'navStyle', label: 'Navigation style', type: 'select', options: [
        { value: 'sidebar', label: 'Sidebar' },
        { value: 'tabs', label: 'Tabs' },
      ] },
      { key: 'density', label: 'Density', type: 'select', options: [
        { value: 'comfortable', label: 'Comfortable' },
        { value: 'compact', label: 'Compact' },
      ] },
      { key: 'cardStyle', label: 'Card style', type: 'select', options: [
        { value: 'soft', label: 'Soft shadow' },
        { value: 'flat', label: 'Flat' },
      ] },
      { key: 'radius', label: 'Corner radius', type: 'range', min: 0, max: 24, step: 2, unit: 'px' },
    ],
  },
  {
    title: 'Colors',
    description: 'Customer dashboard, RFQ, address, and order pages',
    fields: [
      { key: 'surfaceColor', label: 'Canvas', type: 'color' },
      { key: 'panelColor', label: 'Panels', type: 'color' },
      { key: 'textColor', label: 'Text', type: 'color' },
      { key: 'mutedColor', label: 'Muted text', type: 'color' },
      { key: 'accentColor', label: 'Primary action', type: 'color' },
      { key: 'secondaryAccentColor', label: 'Secondary accent', type: 'color' },
      { key: 'borderColor', label: 'Borders', type: 'color' },
    ],
  },
]

const presets: ThemePreset[] = [
  { label: 'Concierge portal', description: 'Premium account experience with sidebar and soft cards.', values: { layout: 'concierge', navStyle: 'sidebar', cardStyle: 'soft', density: 'comfortable' } },
  { label: 'Compact service desk', description: 'Dense, work-focused dashboard for frequent RFQ updates.', values: { layout: 'classic', navStyle: 'tabs', cardStyle: 'flat', density: 'compact', radius: 4 } },
]

export default function AccountThemePage() {
  return (
    <NoCodeThemeStudio
      title="Account Theme Builder"
      description="Edit the customer dashboard, RFQ history, quotation, address, and account pages without code."
      endpoint="/api/admin/theme/account"
      defaults={DEFAULT_CUSTOMER_ACCOUNT_THEME}
      sections={sections}
      preview="account"
      previewLabel="Customer account preview"
      presets={presets}
    />
  )
}
