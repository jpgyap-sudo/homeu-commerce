'use client'

import NoCodeThemeStudio, { type ThemeFieldSection, type ThemePreset } from '../NoCodeThemeStudio'

const defaults = {
  primaryColor: '#1a6d3e',
  secondaryColor: '#151a17',
  accentColor: '#b88935',
  bodyBg: '#f7f4ee',
  textColor: '#151a17',
  mutedColor: '#667168',
  borderColor: '#d9e0d7',
  headingFont: 'Crimson Text, Georgia, serif',
  bodyFont: 'Inter, sans-serif',
  buttonRadius: 8,
  buttonStyle: 'filled',
  buttonUppercase: false,
  layoutMaxWidth: 1200,
  sectionGap: 48,
  customCss: '',
  favicon: '',
}

const sections: ThemeFieldSection[] = [
  {
    title: 'Brand colors',
    description: 'Site-wide color tokens',
    fields: [
      { key: 'primaryColor', label: 'Primary color', type: 'color' },
      { key: 'secondaryColor', label: 'Secondary color', type: 'color' },
      { key: 'accentColor', label: 'Accent color', type: 'color' },
      { key: 'bodyBg', label: 'Page background', type: 'color' },
      { key: 'textColor', label: 'Text color', type: 'color' },
      { key: 'mutedColor', label: 'Muted text', type: 'color' },
      { key: 'borderColor', label: 'Border color', type: 'color' },
    ],
  },
  {
    title: 'Typography',
    description: 'Readable brand type without code',
    fields: [
      { key: 'headingFont', label: 'Heading font stack', type: 'text' },
      { key: 'bodyFont', label: 'Body font stack', type: 'text' },
    ],
  },
  {
    title: 'Buttons and spacing',
    description: 'Reusable storefront rhythm',
    fields: [
      { key: 'buttonRadius', label: 'Button radius', type: 'range', min: 0, max: 24, step: 2, unit: 'px' },
      { key: 'buttonStyle', label: 'Button style', type: 'select', options: [
        { value: 'filled', label: 'Filled' },
        { value: 'outline', label: 'Outline' },
      ] },
      { key: 'buttonUppercase', label: 'Uppercase button labels', type: 'toggle' },
      { key: 'layoutMaxWidth', label: 'Content max width', type: 'range', min: 960, max: 1440, step: 40, unit: 'px' },
      { key: 'sectionGap', label: 'Section gap', type: 'range', min: 20, max: 96, step: 4, unit: 'px' },
    ],
  },
  {
    title: 'SEO & Icons',
    description: 'Search engine metadata and browser icons',
    fields: [
      { key: 'favicon', label: 'Favicon', type: 'image', aspectRatio: '1 / 1', help: 'Small icon shown in the browser tab. Square PNG or SVG recommended.' },
    ],
  },
  {
    title: 'Advanced CSS',
    description: 'Fallback only for edge cases',
    fields: [
      { key: 'customCss', label: 'Custom CSS', type: 'textarea', rows: 10, placeholder: '/* Optional CSS */' },
    ],
  },
]

const presets: ThemePreset[] = [
  { label: 'HomeU balanced', description: 'Warm neutral canvas with green and gold accents.', values: defaults },
  { label: 'Sharper operations', description: 'Cleaner contrast for admin-like utility pages.', values: { bodyBg: '#f5f6f4', textColor: '#101713', borderColor: '#cfd8cc', buttonRadius: 4, sectionGap: 36 } },
]

export default function GlobalThemePage() {
  return (
    <NoCodeThemeStudio
      title="Global Theme Builder"
      description="Control the shared brand system: colors, type, buttons, spacing, and safe advanced CSS."
      endpoint="/api/admin/theme/global"
      defaults={defaults}
      sections={sections}
      preview="global"
      previewLabel="Global style preview"
      presets={presets}
    />
  )
}
