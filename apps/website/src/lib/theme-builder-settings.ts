/**
 * theme-builder-settings.ts
 * ==========================
 * Full no-code theme builder settings schema for ALL section types.
 * Each section exposes typed settings the admin UI auto-renders as controls.
 * Design goal: every visual aspect is controllable without touching code.
 *
 * Usage (admin UI):
 *   const settings = getSectionSettings('slideshow')
 *   // → renders color pickers, image pickers, text inputs, sliders, etc.
 *
 * Usage (storefront):
 *   const config = mergeWithDefaults('slideshow', section.config)
 *   // → full config with all defaults filled in
 */

import type { SectionType } from '@/lib/theme-types'

// ── Types ──────────────────────────────────────────────────────────────────

export type SettingValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, any>
  | null
  | undefined

export interface SettingOption {
  label: string
  value: string | number | boolean
}

export interface SettingCondition {
  key: string
  value: any
}

export interface SettingDefinition {
  key: string
  label: string
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'color'
    | 'image_picker'
    | 'select'
    | 'range'
    | 'checkbox'
    | 'link'
    | 'repeater'
    | 'font_picker'
    | 'alignment'
    | 'collection_picker'
    | 'product_picker'
    | 'focal_point'
    | 'icon_picker'
  default: SettingValue
  options?: SettingOption[]
  placeholder?: string
  min?: number
  max?: number
  step?: number
  hint?: string
  group?: string
  condition?: SettingCondition
  /** For repeater type: the schema for each item */
  itemSettings?: SettingDefinition[]
  /** Max items for repeaters */
  maxItems?: number
  /** Unit suffix for display */
  unit?: string
}

// ── Global Theme Settings ─────────────────────────────────────────────────

export function getGlobalSettings(): SettingDefinition[] {
  return [
    { key: 'primaryColor',      label: 'Primary Color',       type: 'color', default: '#173f2f', group: 'Palette' },
    { key: 'secondaryColor',    label: 'Secondary Color',     type: 'color', default: '#b88935', group: 'Palette' },
    { key: 'accentColor',       label: 'Accent Color',        type: 'color', default: '#151a17', group: 'Palette' },
    { key: 'bodyBg',            label: 'Body Background',     type: 'color', default: '#ffffff', group: 'Palette' },
    { key: 'textColor',         label: 'Text Color',          type: 'color', default: '#1f2420', group: 'Palette' },
    { key: 'mutedColor',        label: 'Muted Text Color',    type: 'color', default: '#67706a', group: 'Palette' },
    { key: 'borderColor',       label: 'Border Color',        type: 'color', default: '#e5e7eb', group: 'Palette' },
    { key: 'headingFont',       label: 'Heading Font',        type: 'font_picker', default: "'Crimson Text', Georgia, serif", group: 'Typography',
      options: [
        { label: 'Crimson Text', value: "'Crimson Text', Georgia, serif" },
        { label: 'Playfair Display', value: "'Playfair Display', serif" },
        { label: 'Inter', value: "'Inter', sans-serif" },
        { label: 'Poppins', value: "'Poppins', sans-serif" },
        { label: 'Montserrat', value: "'Montserrat', sans-serif" },
        { label: 'Georgia', value: 'Georgia, serif' },
      ]},
    { key: 'bodyFont',          label: 'Body Font',           type: 'font_picker', default: "'Cardo', Georgia, serif", group: 'Typography',
      options: [
        { label: 'Cardo', value: "'Cardo', Georgia, serif" },
        { label: 'Inter', value: "'Inter', sans-serif" },
        { label: 'Poppins', value: "'Poppins', sans-serif" },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
      ]},
    { key: 'buttonRadius',      label: 'Button Border Radius', type: 'range', default: 6, min: 0, max: 20, step: 1, unit: 'px', group: 'Buttons' },
    { key: 'buttonStyle',       label: 'Button Style',        type: 'select', default: 'solid', group: 'Buttons',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Outline', value: 'outline' },
        { label: 'Ghost', value: 'ghost' },
      ]},
    { key: 'buttonUppercase',   label: 'Uppercase Buttons',   type: 'checkbox', default: true, group: 'Buttons' },
    { key: 'layoutMaxWidth',    label: 'Max Content Width',   type: 'range', default: 1200, min: 800, max: 1600, step: 20, unit: 'px', group: 'Layout' },
    { key: 'sectionGap',        label: 'Default Section Gap', type: 'range', default: 60, min: 0, max: 120, step: 4, unit: 'px', group: 'Layout' },
    { key: 'favicon',           label: 'Favicon',             type: 'image_picker', default: '', group: 'SEO' },
    { key: 'customCss',         label: 'Custom CSS',          type: 'textarea', default: '', group: 'Advanced',
      hint: 'Inject custom CSS rules (advanced)' },
  ]
}

// ── Common / Reusable Setting Groups ───────────────────────────────────────

const COMMON_SPACING: SettingDefinition[] = [
  { key: 'spacingTop',    label: 'Spacing Top',    type: 'range', default: 60, min: 0, max: 160, step: 4, unit: 'px', group: 'Spacing' },
  { key: 'spacingBottom', label: 'Spacing Bottom', type: 'range', default: 60, min: 0, max: 160, step: 4, unit: 'px', group: 'Spacing' },
]

const COMMON_BG: SettingDefinition[] = [
  { key: 'bgColor',        label: 'Background Color',  type: 'color', default: '#ffffff', group: 'Background' },
  { key: 'textColor',      label: 'Text Color',        type: 'color', default: '#1f2420', group: 'Background' },
  { key: 'sectionMaxWidth', label: 'Max Width',        type: 'range', default: 1200, min: 600, max: 1600, step: 20, unit: 'px', group: 'Layout' },
]

const COMMON_HEADING: SettingDefinition[] = [
  { key: 'heading',         label: 'Heading',       type: 'text', default: '', group: 'Content' },
  { key: 'headingFontSize', label: 'Heading Size',  type: 'range', default: 28, min: 14, max: 80, step: 2, unit: 'px', group: 'Typography',
    condition: { key: 'heading', value: '' } },
  { key: 'headingAlign',    label: 'Heading Align', type: 'alignment', default: 'center', group: 'Typography',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ]},
]

const COMMON_VISIBILITY: SettingDefinition[] = [
  { key: 'hideMobile',  label: 'Hide on Mobile',  type: 'checkbox', default: false, group: 'Visibility' },
  { key: 'hideDesktop', label: 'Hide on Desktop', type: 'checkbox', default: false, group: 'Visibility' },
]

const COMMON_ANIMATION: SettingDefinition[] = [
  { key: 'animation', label: 'Entrance Animation', type: 'select', default: 'none', group: 'Animation',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Fade In', value: 'fadeIn' },
      { label: 'Slide Up', value: 'slideUp' },
      { label: 'Slide In Left', value: 'slideInLeft' },
      { label: 'Slide In Right', value: 'slideInRight' },
      { label: 'Zoom In', value: 'zoomIn' },
    ]},
  { key: 'animationDelay', label: 'Animation Delay', type: 'range', default: 0, min: 0, max: 2000, step: 100, unit: 'ms', group: 'Animation',
    condition: { key: 'animation', value: 'none' } },
]

const COMMON_CUSTOM_CLASS: SettingDefinition[] = [
  { key: 'customClass', label: 'Custom CSS Class', type: 'text', default: '', group: 'Advanced',
    hint: 'Add custom CSS class names (space-separated)' },
]

const COMMON_IMAGE: SettingDefinition[] = [
  { key: 'imageMaxWidth',     label: 'Image Max Width',    type: 'range', default: 100, min: 20, max: 100, step: 5, unit: '%', group: 'Image' },
  { key: 'imageAspectRatio', label: 'Image Aspect Ratio', type: 'select', default: 'auto', group: 'Image',
    options: [
      { label: 'Original', value: 'auto' },
      { label: 'Square (1:1)', value: '1:1' },
      { label: 'Portrait (3:4)', value: '3:4' },
      { label: 'Landscape (4:3)', value: '4:3' },
      { label: 'Wide (16:9)', value: '16:9' },
    ]},
  { key: 'objectFit',        label: 'Image Fit',          type: 'select', default: 'cover', group: 'Image',
    options: [
      { label: 'Cover (crop)', value: 'cover' },
      { label: 'Contain (fit)', value: 'contain' },
    ]},
  { key: 'focalPoint',       label: 'Focal Point',        type: 'focal_point', default: 'center', group: 'Image' },
]

// ── Section-Specific Settings ─────────────────────────────────────────────

const SLIDESHOW_SETTINGS: SettingDefinition[] = [
  { key: 'slides', label: 'Slides', type: 'repeater', default: [], group: 'Slides',
    maxItems: 10,
    itemSettings: [
      { key: 'image',        label: 'Slide Image',      type: 'image_picker', default: '' },
      { key: 'heading',      label: 'Heading',          type: 'text', default: '' },
      { key: 'subheading',   label: 'Subheading',       type: 'text', default: '' },
      { key: 'buttonText',   label: 'Button Label',     type: 'text', default: '' },
      { key: 'buttonLink',   label: 'Button Link',      type: 'link', default: '' },
      { key: 'buttonStyle',  label: 'Button Style',     type: 'select', default: 'primary',
        options: [
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Outline', value: 'outline' },
        ]},
      { key: 'textColor',    label: 'Text Color',       type: 'color', default: '#ffffff' },
      { key: 'overlayColor', label: 'Overlay Color',    type: 'color', default: 'rgba(0,0,0,0.2)' },
      { key: 'overlayOpacity', label: 'Overlay Opacity', type: 'range', default: 20, min: 0, max: 100, step: 5, unit: '%' },
      { key: 'mobileImage',  label: 'Mobile Image (optional)', type: 'image_picker', default: '' },
    ]},
  { key: 'height',         label: 'Slideshow Height',  type: 'range', default: 80, min: 40, max: 100, step: 5, unit: 'vh', group: 'Layout' },
  { key: 'minHeight',      label: 'Min Height',        type: 'range', default: 400, min: 200, max: 800, step: 20, unit: 'px', group: 'Layout' },
  { key: 'maxHeight',      label: 'Max Height',        type: 'range', default: 700, min: 400, max: 1000, step: 20, unit: 'px', group: 'Layout' },
  { key: 'autoRotate',     label: 'Auto Rotate',       type: 'checkbox', default: true, group: 'Behavior' },
  { key: 'rotateInterval', label: 'Rotate Interval (s)', type: 'range', default: 6, min: 2, max: 20, step: 1, unit: 's', group: 'Behavior',
    condition: { key: 'autoRotate', value: true } },
  { key: 'showArrows',     label: 'Show Arrows',       type: 'checkbox', default: true, group: 'Behavior' },
  { key: 'showDots',       label: 'Show Dot Nav',      type: 'checkbox', default: true, group: 'Behavior' },
  { key: 'contentPosition', label: 'Content Position',  type: 'select', default: 'bottom', group: 'Layout',
    options: [
      { label: 'Top', value: 'top' },
      { label: 'Center', value: 'center' },
      { label: 'Bottom', value: 'bottom' },
    ]},
  { key: 'contentAlign',   label: 'Content Alignment', type: 'alignment', default: 'center', group: 'Layout',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ]},
  ...COMMON_CUSTOM_CLASS,
]

const BRAND_TEXT_SETTINGS: SettingDefinition[] = [
  { key: 'title',         label: 'Title',             type: 'text', default: 'HOME ATELIER', group: 'Content' },
  { key: 'body',          label: 'Body Text',         type: 'textarea', default: '', group: 'Content',
    placeholder: 'Enter your brand statement...' },
  { key: 'logoAnim',      label: 'Animated Gradient Logo', type: 'checkbox', default: false, group: 'Animation',
    hint: 'Makes the title text flow through a moving gradient of brand colors' },
  { key: 'maxWidth',      label: 'Max Width',         type: 'range', default: 700, min: 400, max: 1200, step: 20, unit: 'px', group: 'Layout' },
  { key: 'titleSize',     label: 'Title Size',        type: 'range', default: 28, min: 16, max: 60, step: 2, unit: 'px', group: 'Typography' },
  { key: 'bodySize',      label: 'Body Size',         type: 'range', default: 16, min: 12, max: 28, step: 1, unit: 'px', group: 'Typography' },
  ...COMMON_BG,
  ...COMMON_SPACING,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const COLLECTION_GRID_SETTINGS: SettingDefinition[] = [
  { key: 'heading',        label: 'Heading',          type: 'text', default: '', group: 'Content' },
  { key: 'source',         label: 'Source',           type: 'select', default: 'featured', group: 'Content',
    options: [
      { label: 'Featured Only', value: 'featured' },
      { label: 'All Collections', value: 'all' },
      { label: 'Curated Slugs', value: 'curated' },
    ]},
  { key: 'curatedSlugs',   label: 'Curated Collection Slugs', type: 'text', default: '', group: 'Content',
    hint: 'Comma-separated collection slugs for curated mode',
    condition: { key: 'source', value: 'curated' } },
  { key: 'limit',          label: 'Max Collections',  type: 'range', default: 15, min: 1, max: 30, step: 1, group: 'Content',
    condition: { key: 'source', value: 'all' } },
  { key: 'columnsDesktop', label: 'Desktop Columns',  type: 'range', default: 3, min: 1, max: 6, step: 1, group: 'Layout' },
  { key: 'columnsTablet',  label: 'Tablet Columns',   type: 'range', default: 2, min: 1, max: 4, step: 1, group: 'Layout' },
  { key: 'gap',            label: 'Gap',              type: 'range', default: 30, min: 4, max: 80, step: 2, unit: 'px', group: 'Layout' },
  { key: 'aspectRatio',    label: 'Card Aspect Ratio',type: 'select', default: '1:1', group: 'Layout',
    options: [
      { label: 'Square (1:1)', value: '1:1' },
      { label: 'Portrait (3:4)', value: '3:4' },
      { label: 'Landscape (4:3)', value: '4:3' },
      { label: 'Wide (16:9)', value: '16:9' },
    ]},
  { key: 'cardRadius',     label: 'Card Border Radius', type: 'range', default: 0, min: 0, max: 30, step: 1, unit: 'px', group: 'Layout' },
  { key: 'titleColor',     label: 'Title Color',       type: 'color', default: '#ffffff', group: 'Typography' },
  { key: 'titleSize',      label: 'Title Size',        type: 'range', default: 29, min: 14, max: 48, step: 2, unit: 'px', group: 'Typography' },
  { key: 'overlayColor',   label: 'Overlay Color',     type: 'color', default: 'rgba(104,88,88,0.1)', group: 'Background' },
  { key: 'hoverEffect',    label: 'Hover Effect',      type: 'select', default: 'scale', group: 'Behavior',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Scale', value: 'scale' },
      { label: 'Overlay Darken', value: 'darken' },
      { label: 'Both', value: 'both' },
    ]},
  ...COMMON_SPACING,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const IMAGE_WITH_TEXT_SETTINGS: SettingDefinition[] = [
  { key: 'image',            label: 'Image',           type: 'image_picker', default: '', group: 'Content' },
  { key: 'title',            label: 'Title',           type: 'text', default: '', group: 'Content' },
  { key: 'text',             label: 'Body Text',       type: 'textarea', default: '', group: 'Content' },
  { key: 'buttonText',       label: 'Button Label',    type: 'text', default: '', group: 'Content' },
  { key: 'buttonLink',       label: 'Button Link',     type: 'link', default: '', group: 'Content' },
  { key: 'imagePosition',    label: 'Image Position',  type: 'select', default: 'left', group: 'Layout',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ]},
  { key: 'imageWidth',       label: 'Image Width',     type: 'select', default: '50%', group: 'Layout',
    options: [
      { label: '40%', value: '40%' },
      { label: '50%', value: '50%' },
      { label: '60%', value: '60%' },
    ]},
  { key: 'contentBg',        label: 'Content Background', type: 'color', default: '#ffffff', group: 'Background' },
  { key: 'contentPadding',   label: 'Content Padding', type: 'range', default: 56, min: 16, max: 120, step: 8, unit: 'px', group: 'Layout' },
  { key: 'minHeight',        label: 'Min Section Height', type: 'range', default: 480, min: 200, max: 800, step: 20, unit: 'px', group: 'Layout' },
  { key: 'titleSize',        label: 'Title Size',      type: 'range', default: 32, min: 16, max: 60, step: 2, unit: 'px', group: 'Typography' },
  { key: 'textSize',         label: 'Body Size',       type: 'range', default: 15, min: 12, max: 24, step: 1, unit: 'px', group: 'Typography' },
  { key: 'textColor',        label: 'Text Color',      type: 'color', default: '#666', group: 'Typography' },
  ...COMMON_SPACING,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const IMAGE_BAR_SETTINGS: SettingDefinition[] = [
  { key: 'images',        label: 'Images',       type: 'repeater', default: [], maxItems: 6, group: 'Content',
    itemSettings: [
      { key: 'image', label: 'Image',     type: 'image_picker', default: '' },
      { key: 'alt',   label: 'Alt Text',  type: 'text', default: '' },
      { key: 'link',  label: 'Link URL',  type: 'link', default: '' },
    ]},
  { key: 'height',        label: 'Bar Height',  type: 'range', default: 320, min: 120, max: 600, step: 10, unit: 'px', group: 'Layout' },
  { key: 'mobileHeight',  label: 'Mobile Height', type: 'range', default: 180, min: 80, max: 400, step: 10, unit: 'px', group: 'Layout' },
  { key: 'columns',       label: 'Columns',     type: 'range', default: 3, min: 1, max: 6, step: 1, group: 'Layout' },
  { key: 'gap',           label: 'Gap',          type: 'range', default: 0, min: 0, max: 40, step: 2, unit: 'px', group: 'Layout' },
  { key: 'hoverZoom',     label: 'Hover Zoom Effect', type: 'checkbox', default: true, group: 'Behavior' },
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const FEATURED_PRODUCTS_SETTINGS: SettingDefinition[] = [
  { key: 'heading',         label: 'Heading',            type: 'text', default: 'More Featured Pieces', group: 'Content' },
  { key: 'source',          label: 'Product Source',     type: 'select', default: 'auto', group: 'Content',
    options: [
      { label: 'Auto (newest)', value: 'auto' },
      { label: 'From Collection', value: 'collection' },
      { label: 'Curated IDs', value: 'curated' },
    ]},
  { key: 'collectionSlug',  label: 'Collection Slug',    type: 'text', default: 'feature', group: 'Content',
    hint: 'Slug of the collection to pull products from',
    condition: { key: 'source', value: 'collection' } },
  { key: 'curatedIds',      label: 'Curated Product IDs', type: 'text', default: '', group: 'Content',
    hint: 'Comma-separated product IDs',
    condition: { key: 'source', value: 'curated' } },
  { key: 'limit',           label: 'Max Products',       type: 'range', default: 10, min: 1, max: 24, step: 1, group: 'Content' },
  { key: 'columnsDesktop',  label: 'Desktop Columns',    type: 'range', default: 5, min: 1, max: 8, step: 1, group: 'Layout' },
  { key: 'columnsTablet',   label: 'Tablet Columns',     type: 'range', default: 3, min: 1, max: 6, step: 1, group: 'Layout' },
  { key: 'columnsMobile',   label: 'Mobile Columns',     type: 'range', default: 2, min: 1, max: 4, step: 1, group: 'Layout' },
  { key: 'gap',             label: 'Grid Gap',           type: 'range', default: 24, min: 4, max: 60, step: 2, unit: 'px', group: 'Layout' },
  { key: 'imageAspectRatio', label: 'Image Aspect Ratio', type: 'select', default: '3:4', group: 'Layout',
    options: [
      { label: 'Square (1:1)', value: '1:1' },
      { label: 'Portrait (3:4)', value: '3:4' },
      { label: 'Landscape (4:3)', value: '4:3' },
    ]},
  { key: 'imageRadius',     label: 'Image Border Radius', type: 'range', default: 3, min: 0, max: 30, step: 1, unit: 'px', group: 'Layout' },
  { key: 'showPrice',       label: 'Show Price',         type: 'checkbox', default: true, group: 'Content' },
  { key: 'showSaleBadge',   label: 'Show Sale Badge',    type: 'checkbox', default: true, group: 'Content' },
  { key: 'saleBadgeColor',  label: 'Sale Badge Color',   type: 'color', default: '#EA0606', group: 'Background',
    condition: { key: 'showSaleBadge', value: true } },
  { key: 'titleSize',       label: 'Title Size',         type: 'range', default: 17, min: 12, max: 28, step: 1, unit: 'px', group: 'Typography' },
  { key: 'priceSize',       label: 'Price Size',         type: 'range', default: 14, min: 10, max: 24, step: 1, unit: 'px', group: 'Typography' },
  { key: 'viewAllText',     label: '"View All" Label',   type: 'text', default: 'View all', group: 'Content' },
  { key: 'showViewAll',     label: 'Show "View All"',    type: 'checkbox', default: true, group: 'Content' },
  { key: 'hoverEffect',     label: 'Card Hover Effect',  type: 'select', default: 'scale', group: 'Behavior',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Scale', value: 'scale' },
      { label: 'Shadow', value: 'shadow' },
    ]},
  ...COMMON_SPACING,
  ...COMMON_BG,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const REVIEWS_SETTINGS: SettingDefinition[] = [
  { key: 'heading',         label: 'Heading',           type: 'text', default: 'Let Customers Speak For Us', group: 'Content' },
  { key: 'columns',         label: 'Review Columns',    type: 'range', default: 3, min: 1, max: 5, step: 1, group: 'Layout' },
  { key: 'autoScroll',      label: 'Auto Scroll',       type: 'checkbox', default: true, group: 'Behavior' },
  { key: 'scrollInterval',  label: 'Scroll Interval (s)', type: 'range', default: 2, min: 1, max: 10, step: 0.5, unit: 's', group: 'Behavior',
    condition: { key: 'autoScroll', value: true } },
  { key: 'maxReviews',      label: 'Max Reviews',       type: 'range', default: 12, min: 1, max: 50, step: 1, group: 'Content' },
  ...COMMON_SPACING,
  ...COMMON_BG,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const INSTAGRAM_SETTINGS: SettingDefinition[] = [
  { key: 'heading',      label: 'Heading',       type: 'text', default: 'Follow @homeatelierph', group: 'Content' },
  { key: 'handle',       label: 'Instagram Handle', type: 'text', default: 'homeatelierph', group: 'Content' },
  { key: 'tiles',        label: 'Number of Tiles', type: 'range', default: 6, min: 2, max: 24, step: 1, group: 'Layout' },
  { key: 'columnsDesktop', label: 'Desktop Columns', type: 'range', default: 6, min: 2, max: 8, step: 1, group: 'Layout' },
  { key: 'columnsTablet',  label: 'Tablet Columns',  type: 'range', default: 3, min: 1, max: 6, step: 1, group: 'Layout' },
  { key: 'columnsMobile',  label: 'Mobile Columns',  type: 'range', default: 2, min: 1, max: 4, step: 1, group: 'Layout' },
  { key: 'gap',           label: 'Tile Gap',       type: 'range', default: 4, min: 0, max: 20, step: 1, unit: 'px', group: 'Layout' },
  { key: 'tileRadius',    label: 'Tile Border Radius', type: 'range', default: 0, min: 0, max: 20, step: 1, unit: 'px', group: 'Layout' },
  { key: 'showProfileLink', label: 'Show Profile Link', type: 'checkbox', default: true, group: 'Content' },
  ...COMMON_SPACING,
  ...COMMON_BG,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const CTA_SETTINGS: SettingDefinition[] = [
  { key: 'heading',        label: 'Heading',          type: 'text', default: '', group: 'Content' },
  { key: 'text',           label: 'Body Text',        type: 'textarea', default: '', group: 'Content' },
  { key: 'primaryText',    label: 'Primary Button',   type: 'text', default: '', group: 'Content' },
  { key: 'primaryLink',    label: 'Primary Button Link', type: 'link', default: '', group: 'Content' },
  { key: 'secondaryText',  label: 'Secondary Button', type: 'text', default: '', group: 'Content' },
  { key: 'secondaryLink',  label: 'Secondary Button Link', type: 'link', default: '', group: 'Content' },
  { key: 'contentMaxWidth', label: 'Max Width',       type: 'range', default: 600, min: 300, max: 1200, step: 20, unit: 'px', group: 'Layout' },
  { key: 'headingSize',    label: 'Heading Size',     type: 'range', default: 36, min: 18, max: 72, step: 2, unit: 'px', group: 'Typography' },
  { key: 'textSize',       label: 'Body Size',        type: 'range', default: 15, min: 12, max: 24, step: 1, unit: 'px', group: 'Typography' },
  { key: 'buttonStyle',    label: 'Button Style',     type: 'select', default: 'primary', group: 'Content',
    options: [
      { label: 'Primary', value: 'primary' },
      { label: 'Secondary', value: 'secondary' },
      { label: 'Outline', value: 'outline' },
    ]},
  ...COMMON_BG,
  ...COMMON_SPACING,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const NEWSLETTER_SETTINGS: SettingDefinition[] = [
  { key: 'heading',        label: 'Heading',            type: 'text', default: 'Join our mailing list', group: 'Content' },
  { key: 'subtext',        label: 'Subtext',            type: 'text', default: '', group: 'Content' },
  { key: 'placeholder',    label: 'Input Placeholder',  type: 'text', default: 'Enter your email', group: 'Form' },
  { key: 'buttonText',     label: 'Button Label',       type: 'text', default: 'Subscribe', group: 'Form' },
  { key: 'successMessage', label: 'Success Message',    type: 'text', default: 'Thanks for subscribing!', group: 'Form' },
  { key: 'formWidth',      label: 'Form Max Width',     type: 'range', default: 440, min: 240, max: 800, step: 20, unit: 'px', group: 'Layout' },
  { key: 'inputRadius',    label: 'Input Border Radius', type: 'range', default: 6, min: 0, max: 20, step: 1, unit: 'px', group: 'Form' },
  { key: 'inputBorderColor', label: 'Input Border',     type: 'color', default: '#d9d9d9', group: 'Form' },
  ...COMMON_BG,
  ...COMMON_SPACING,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const LOGO_BAR_SETTINGS: SettingDefinition[] = [
  { key: 'heading',     label: 'Heading',           type: 'text', default: '', group: 'Content' },
  { key: 'logos',       label: 'Logos',             type: 'repeater', default: [], maxItems: 12, group: 'Content',
    itemSettings: [
      { key: 'image', label: 'Logo Image', type: 'image_picker', default: '' },
      { key: 'alt',   label: 'Alt Text',   type: 'text', default: '' },
      { key: 'link',  label: 'Link URL',   type: 'link', default: '' },
    ]},
  { key: 'logoWidth',   label: 'Logo Width',        type: 'range', default: 120, min: 60, max: 300, step: 10, unit: 'px', group: 'Layout' },
  { key: 'logoHeight',  label: 'Logo Height',       type: 'range', default: 48, min: 24, max: 120, step: 8, unit: 'px', group: 'Layout' },
  { key: 'gap',         label: 'Logo Gap',          type: 'range', default: 36, min: 8, max: 80, step: 4, unit: 'px', group: 'Layout' },
  { key: 'grayscale',   label: 'Grayscale Logos',   type: 'checkbox', default: true, group: 'Behavior' },
  { key: 'hoverOpacity', label: 'Hover Opacity',    type: 'range', default: 70, min: 0, max: 100, step: 5, unit: '%', group: 'Behavior' },
  ...COMMON_SPACING,
  ...COMMON_BG,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const TESTIMONIAL_SETTINGS: SettingDefinition[] = [
  { key: 'heading',      label: 'Heading',         type: 'text', default: 'What Our Customers Say', group: 'Content' },
  { key: 'testimonials', label: 'Testimonials',    type: 'repeater', default: [], maxItems: 12, group: 'Content',
    itemSettings: [
      { key: 'quote',  label: 'Quote',  type: 'textarea', default: '' },
      { key: 'author', label: 'Author', type: 'text', default: '' },
      { key: 'role',   label: 'Role',   type: 'text', default: '' },
      { key: 'avatar', label: 'Avatar', type: 'image_picker', default: '' },
    ]},
  { key: 'columns',      label: 'Columns',         type: 'range', default: 3, min: 1, max: 4, step: 1, group: 'Layout' },
  { key: 'cardRadius',   label: 'Card Radius',     type: 'range', default: 12, min: 0, max: 30, step: 1, unit: 'px', group: 'Layout' },
  { key: 'cardBg',       label: 'Card Background', type: 'color', default: '#ffffff', group: 'Background' },
  { key: 'cardBorder',   label: 'Card Border',     type: 'color', default: '#eef1ed', group: 'Background' },
  { key: 'quoteStyle',   label: 'Quote Style',     type: 'select', default: 'italic', group: 'Typography',
    options: [
      { label: 'Italic', value: 'italic' },
      { label: 'Normal', value: 'normal' },
      { label: 'Bold', value: 'bold' },
    ]},
  { key: 'showAvatar',   label: 'Show Avatar',     type: 'checkbox', default: true, group: 'Content' },
  ...COMMON_SPACING,
  ...COMMON_BG,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const STATS_COUNTER_SETTINGS: SettingDefinition[] = [
  { key: 'heading',     label: 'Heading',        type: 'text', default: '', group: 'Content' },
  { key: 'stats',       label: 'Statistics',     type: 'repeater', default: [], maxItems: 6, group: 'Content',
    itemSettings: [
      { key: 'number', label: 'Number', type: 'text', default: '0' },
      { key: 'prefix', label: 'Prefix', type: 'text', default: '', hint: 'e.g. $, ₱, +' },
      { key: 'label',  label: 'Label',  type: 'text', default: '' },
      { key: 'suffix', label: 'Suffix', type: 'text', default: '', hint: 'e.g. %, +' },
    ]},
  { key: 'columns',     label: 'Columns',        type: 'range', default: 4, min: 1, max: 6, step: 1, group: 'Layout' },
  { key: 'counterBg',   label: 'Background Color', type: 'color', default: '#151a17', group: 'Background' },
  { key: 'counterTextColor', label: 'Text Color', type: 'color', default: '#ffffff', group: 'Typography' },
  { key: 'numberSize',  label: 'Number Size',    type: 'range', default: 36, min: 18, max: 80, step: 2, unit: 'px', group: 'Typography' },
  { key: 'labelSize',   label: 'Label Size',     type: 'range', default: 14, min: 10, max: 24, step: 1, unit: 'px', group: 'Typography' },
  { key: 'animate',     label: 'Animate Count Up', type: 'checkbox', default: true, group: 'Behavior' },
  ...COMMON_SPACING,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const BLOG_POSTS_SETTINGS: SettingDefinition[] = [
  { key: 'heading',     label: 'Heading',         type: 'text', default: 'From Our Journal', group: 'Content' },
  { key: 'limit',       label: 'Max Posts',       type: 'range', default: 4, min: 1, max: 12, step: 1, group: 'Content' },
  { key: 'layout',      label: 'Layout Style',    type: 'select', default: 'grid', group: 'Layout',
    options: [
      { label: 'Grid', value: 'grid' },
      { label: 'List', value: 'list' },
    ]},
  { key: 'columns',     label: 'Columns (Grid)',  type: 'range', default: 3, min: 1, max: 4, step: 1, group: 'Layout',
    condition: { key: 'layout', value: 'grid' } },
  { key: 'showDate',    label: 'Show Date',       type: 'checkbox', default: true, group: 'Content' },
  { key: 'showCategory', label: 'Show Category',  type: 'checkbox', default: true, group: 'Content' },
  { key: 'imageRadius', label: 'Image Radius',    type: 'range', default: 8, min: 0, max: 30, step: 1, unit: 'px', group: 'Layout' },
  { key: 'imageHeight', label: 'Image Height',    type: 'range', default: 200, min: 100, max: 400, step: 10, unit: 'px', group: 'Layout' },
  ...COMMON_SPACING,
  ...COMMON_BG,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const PROMO_BAR_SETTINGS: SettingDefinition[] = [
  { key: 'text',       label: 'Promo Text',       type: 'text', default: '', group: 'Content' },
  { key: 'link',       label: 'Link URL',         type: 'link', default: '', group: 'Content' },
  { key: 'bgColor',    label: 'Background',       type: 'color', default: '#151a17', group: 'Background' },
  { key: 'textColor',  label: 'Text Color',       type: 'color', default: '#ffffff', group: 'Typography' },
  { key: 'fontSize',   label: 'Font Size',        type: 'range', default: 14, min: 11, max: 22, step: 1, unit: 'px', group: 'Typography' },
  { key: 'sticky',     label: 'Sticky',           type: 'checkbox', default: false, group: 'Behavior' },
  { key: 'dismissible', label: 'Dismissible',     type: 'checkbox', default: false, group: 'Behavior' },
  ...COMMON_CUSTOM_CLASS,
]

const VIDEO_HERO_SETTINGS: SettingDefinition[] = [
  { key: 'videoUrl',      label: 'Video URL (MP4)',    type: 'text', default: '', group: 'Content',
    hint: 'Direct URL to an MP4 file' },
  { key: 'posterImage',   label: 'Poster Image',       type: 'image_picker', default: '', group: 'Content' },
  { key: 'heading',       label: 'Heading',            type: 'text', default: '', group: 'Content' },
  { key: 'subheading',    label: 'Subheading',         type: 'text', default: '', group: 'Content' },
  { key: 'buttonText',    label: 'Button Label',       type: 'text', default: '', group: 'Content' },
  { key: 'buttonLink',    label: 'Button Link',        type: 'link', default: '', group: 'Content' },
  { key: 'overlayColor',  label: 'Overlay Color',      type: 'color', default: '', group: 'Background' },
  { key: 'overlayOpacity', label: 'Overlay Opacity',   type: 'range', default: 0, min: 0, max: 100, step: 5, unit: '%', group: 'Background' },
  { key: 'height',        label: 'Hero Height',        type: 'range', default: 90, min: 40, max: 100, step: 5, unit: 'vh', group: 'Layout' },
  { key: 'headingSize',   label: 'Heading Size',       type: 'range', default: 48, min: 24, max: 96, step: 2, unit: 'px', group: 'Typography' },
  { key: 'textColor',     label: 'Text Color',         type: 'color', default: '#ffffff', group: 'Typography' },
  { key: 'contentMaxWidth', label: 'Max Content Width', type: 'range', default: 640, min: 300, max: 1200, step: 20, unit: 'px', group: 'Layout' },
  { key: 'muted',         label: 'Muted (no audio)',   type: 'checkbox', default: true, group: 'Behavior' },
  { key: 'loop',          label: 'Loop Video',          type: 'checkbox', default: true, group: 'Behavior' },
  ...COMMON_CUSTOM_CLASS,
]

const LOOKBOOK_SETTINGS: SettingDefinition[] = [
  { key: 'heading',  label: 'Heading',    type: 'text', default: '', group: 'Content' },
  { key: 'items',    label: 'Lookbook Items', type: 'repeater', default: [], maxItems: 12, group: 'Content',
    itemSettings: [
      { key: 'image',   label: 'Image',     type: 'image_picker', default: '' },
      { key: 'title',   label: 'Title',     type: 'text', default: '' },
      { key: 'link',    label: 'Link URL',   type: 'link', default: '' },
      { key: 'colSpan', label: 'Column Span', type: 'range', default: 1, min: 1, max: 3, step: 1 },
      { key: 'rowSpan', label: 'Row Span',   type: 'range', default: 1, min: 1, max: 3, step: 1 },
    ]},
  { key: 'columns',      label: 'Grid Columns', type: 'range', default: 3, min: 1, max: 6, step: 1, group: 'Layout' },
  { key: 'gap',          label: 'Item Gap',     type: 'range', default: 8, min: 0, max: 32, step: 2, unit: 'px', group: 'Layout' },
  { key: 'itemRadius',   label: 'Item Radius',  type: 'range', default: 8, min: 0, max: 30, step: 1, unit: 'px', group: 'Layout' },
  { key: 'showTitle',    label: 'Show Title',   type: 'checkbox', default: true, group: 'Content' },
  ...COMMON_SPACING,
  ...COMMON_BG,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

const CATEGORY_CAROUSEL_SETTINGS: SettingDefinition[] = [
  { key: 'heading',        label: 'Heading',           type: 'text', default: '', group: 'Content' },
  { key: 'source',         label: 'Source',            type: 'select', default: 'featured', group: 'Content',
    options: [
      { label: 'Featured', value: 'featured' },
      { label: 'All', value: 'all' },
    ]},
  { key: 'limit',          label: 'Max Categories',    type: 'range', default: 10, min: 1, max: 20, step: 1, group: 'Content' },
  { key: 'cardWidth',      label: 'Card Width',        type: 'range', default: 220, min: 120, max: 400, step: 10, unit: 'px', group: 'Layout' },
  { key: 'imageHeight',    label: 'Image Height',      type: 'range', default: 220, min: 100, max: 400, step: 10, unit: 'px', group: 'Layout' },
  { key: 'cardRadius',     label: 'Card Radius',       type: 'range', default: 12, min: 0, max: 30, step: 1, unit: 'px', group: 'Layout' },
  { key: 'cardBg',         label: 'Card Background',   type: 'color', default: '#ffffff', group: 'Background' },
  { key: 'gap',            label: 'Card Gap',          type: 'range', default: 16, min: 4, max: 40, step: 2, unit: 'px', group: 'Layout' },
  { key: 'titleSize',      label: 'Title Size',        type: 'range', default: 14, min: 10, max: 24, step: 1, unit: 'px', group: 'Typography' },
  ...COMMON_SPACING,
  ...COMMON_BG,
  ...COMMON_VISIBILITY,
  ...COMMON_ANIMATION,
  ...COMMON_CUSTOM_CLASS,
]

// ── Footer Sections ────────────────────────────────────────────────────────

const FOOTER_BRAND_SETTINGS: SettingDefinition[] = [
  { key: 'name',     label: 'Company Name',     type: 'text', default: '', group: 'Content' },
  { key: 'tagline',  label: 'Tagline',          type: 'textarea', default: '', group: 'Content' },
  { key: 'address1', label: 'Address Line 1',   type: 'text', default: '', group: 'Content' },
  { key: 'city',     label: 'City',             type: 'text', default: '', group: 'Content' },
  { key: 'country',  label: 'Country',          type: 'text', default: '', group: 'Content' },
  { key: 'email',    label: 'Email',            type: 'text', default: '', group: 'Content' },
  { key: 'phone',    label: 'Phone',            type: 'text', default: '', group: 'Content' },
  ...COMMON_CUSTOM_CLASS,
]

const FOOTER_QUICK_LINKS_SETTINGS: SettingDefinition[] = [
  { key: 'title',  label: 'Heading',      type: 'text', default: 'Quick Links', group: 'Content' },
  ...COMMON_CUSTOM_CLASS,
]

const FOOTER_NEWSLETTER_SETTINGS: SettingDefinition[] = [
  { key: 'title',          label: 'Heading',          type: 'text', default: 'Subscribe', group: 'Content' },
  { key: 'description',    label: 'Description',      type: 'text', default: '', group: 'Content' },
  { key: 'placeholder',    label: 'Input Placeholder', type: 'text', default: 'Enter your email', group: 'Form' },
  { key: 'buttonText',     label: 'Button Label',     type: 'text', default: 'Subscribe', group: 'Form' },
  ...COMMON_CUSTOM_CLASS,
]

const FOOTER_SOCIAL_SETTINGS: SettingDefinition[] = [
  { key: 'heading',     label: 'Heading',        type: 'text', default: 'Follow Us', group: 'Content' },
  { key: 'facebook',    label: 'Facebook URL',   type: 'text', default: '', group: 'Social Links' },
  { key: 'instagram',   label: 'Instagram URL',  type: 'text', default: '', group: 'Social Links' },
  { key: 'twitter',     label: 'Twitter/X URL',  type: 'text', default: '', group: 'Social Links' },
  { key: 'youtube',     label: 'YouTube URL',    type: 'text', default: '', group: 'Social Links' },
  { key: 'pinterest',   label: 'Pinterest URL',  type: 'text', default: '', group: 'Social Links' },
  { key: 'tiktok',      label: 'TikTok URL',     type: 'text', default: '', group: 'Social Links' },
  { key: 'linkedin',    label: 'LinkedIn URL',   type: 'text', default: '', group: 'Social Links' },
  { key: 'showIcons',   label: 'Show Social Icons', type: 'checkbox', default: true, group: 'Social Links' },
  ...COMMON_CUSTOM_CLASS,
]

const PRODUCT_DETAILS_SETTINGS: SettingDefinition[] = [
  { key: 'showBreadcrumbs', label: 'Show Breadcrumbs', type: 'checkbox', default: true, group: 'Visibility' },
  { key: 'showSku', label: 'Show SKU', type: 'checkbox', default: true, group: 'Visibility' },
  { key: 'showMaterials', label: 'Show Materials', type: 'checkbox', default: true, group: 'Visibility' },
  { key: 'showDimensions', label: 'Show Dimensions', type: 'checkbox', default: true, group: 'Visibility' },
  { key: 'enableZoom', label: 'Enable Image Zoom', type: 'checkbox', default: true, group: 'Gallery' },
  { key: 'buttonText', label: 'Request Quote Button Text', type: 'text', default: 'Request Quote', group: 'RFQ' },
  ...COMMON_SPACING,
  ...COMMON_CUSTOM_CLASS,
]

const COLLECTION_HEADER_SETTINGS: SettingDefinition[] = [
  { key: 'showDescription', label: 'Show Description', type: 'checkbox', default: true, group: 'Content' },
  { key: 'showBanner', label: 'Show Banner Image', type: 'checkbox', default: true, group: 'Banner' },
  { key: 'bannerHeight', label: 'Banner Height', type: 'range', default: 300, min: 150, max: 600, step: 10, unit: 'px', group: 'Banner' },
  ...COMMON_SPACING,
  ...COMMON_CUSTOM_CLASS,
]

const PRODUCT_GRID_SETTINGS: SettingDefinition[] = [
  { key: 'columns', label: 'Grid Columns', type: 'range', default: 4, min: 2, max: 5, step: 1, group: 'Layout' },
  { key: 'pageSize', label: 'Products Per Page', type: 'number', default: 24, group: 'Layout' },
  { key: 'showFilters', label: 'Show Sidebar Filters', type: 'checkbox', default: true, group: 'Sidebar' },
  { key: 'showSort', label: 'Show Sorting Dropdown', type: 'checkbox', default: true, group: 'Layout' },
  ...COMMON_SPACING,
  ...COMMON_CUSTOM_CLASS,
]

// ── Schema Registry ────────────────────────────────────────────────────────

const SECTION_SETTINGS_SCHEMA: Record<SectionType, SettingDefinition[]> = {
  slideshow:          SLIDESHOW_SETTINGS,
  brand_text:         BRAND_TEXT_SETTINGS,
  collection_grid:    COLLECTION_GRID_SETTINGS,
  image_with_text:    IMAGE_WITH_TEXT_SETTINGS,
  image_bar:          IMAGE_BAR_SETTINGS,
  featured_products:  FEATURED_PRODUCTS_SETTINGS,
  reviews:            REVIEWS_SETTINGS,
  instagram:          INSTAGRAM_SETTINGS,
  cta:                CTA_SETTINGS,
  newsletter:         NEWSLETTER_SETTINGS,
  logo_bar:           LOGO_BAR_SETTINGS,
  testimonial:        TESTIMONIAL_SETTINGS,
  stats_counter:      STATS_COUNTER_SETTINGS,
  blog_posts:         BLOG_POSTS_SETTINGS,
  promo_bar:          PROMO_BAR_SETTINGS,
  video_hero:         VIDEO_HERO_SETTINGS,
  lookbook:           LOOKBOOK_SETTINGS,
  category_carousel:  CATEGORY_CAROUSEL_SETTINGS,
  product_details:    PRODUCT_DETAILS_SETTINGS,
  collection_header:  COLLECTION_HEADER_SETTINGS,
  product_grid:       PRODUCT_GRID_SETTINGS,
  footer_brand:       FOOTER_BRAND_SETTINGS,
  footer_quick_links: FOOTER_QUICK_LINKS_SETTINGS,
  footer_newsletter:  FOOTER_NEWSLETTER_SETTINGS,
  footer_social:      FOOTER_SOCIAL_SETTINGS,
}

// ── Helper Functions ──────────────────────────────────────────────────────

/** Get the typed settings definitions for a given section type */
export function getSectionSettings(type: SectionType): SettingDefinition[] {
  return SECTION_SETTINGS_SCHEMA[type] || []
}

/** Get the default config object for a given section type */
export function getDefaultConfig(type: SectionType): Record<string, any> {
  const settings = getSectionSettings(type)
  const config: Record<string, any> = {}
  for (const s of settings) {
    config[s.key] = s.default
  }
  return config
}

/** Merge user config with defaults, filling in any missing keys */
export function mergeWithDefaults(
  type: SectionType,
  userConfig: Record<string, any> = {}
): Record<string, any> {
  const defaults = getDefaultConfig(type)
  const merged = { ...defaults, ...userConfig }

  // Also handle repeater items — merge item defaults into each repeater entry
  const settings = getSectionSettings(type)
  for (const s of settings) {
    if (s.type === 'repeater' && s.itemSettings && Array.isArray(merged[s.key])) {
      merged[s.key] = merged[s.key].map((item: any) => {
        const itemDefaults: Record<string, any> = {}
        for (const is of s.itemSettings!) {
          itemDefaults[is.key] = is.default
        }
        return { ...itemDefaults, ...item }
      })
    }
  }

  return merged
}

/** Validate that a config object has all required fields */
export function validateConfig(
  type: SectionType,
  config: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const settings = getSectionSettings(type)

  for (const s of settings) {
    const val = config[s.key]
    if (val === undefined || val === null) {
      // Missing key — will be filled by mergeWithDefaults, not an error
      continue
    }
    // Validate type-specific constraints
    if (s.type === 'number' || s.type === 'range') {
      const num = Number(val)
      if (isNaN(num)) {
        errors.push(`${s.label}: must be a number`)
      } else {
        if (s.min !== undefined && num < s.min) errors.push(`${s.label}: minimum is ${s.min}`)
        if (s.max !== undefined && num > s.max) errors.push(`${s.label}: maximum is ${s.max}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/** Get all section types that have settings defined */
export function getConfiguredSectionTypes(): SectionType[] {
  return Object.keys(SECTION_SETTINGS_SCHEMA) as SectionType[]
}

export default SECTION_SETTINGS_SCHEMA
