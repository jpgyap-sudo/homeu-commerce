/**
 * theme-schemas.ts
 * =================
 * Bridge file — delegates to the new theme-builder-settings.ts system.
 * Kept for backward compat with ThemeEditor.tsx imports.
 *
 * The canonical settings definitions live in:
 *   apps/website/src/lib/theme-builder-settings.ts
 *
 * TODO: Migrate ThemeEditor.tsx to use getSectionSettings() directly,
 * then this file can be removed.
 */

export type FieldType = 'text' | 'textarea' | 'url' | 'number' | 'color' | 'list' | 'product_picker' | 'collection_picker'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  help?: string
  itemFields?: { key: string; label: string; type: FieldType; placeholder?: string }[]
}

import { getSectionSettings, type SettingDefinition } from '@/lib/theme-builder-settings'
import type { SectionType } from '@/lib/theme-types'

/**
 * Convert the new SettingDefinition to the old FieldDef format.
 */
function toFieldDefs(settings: SettingDefinition[]): FieldDef[] {
  return settings
    .filter(s => {
      // Skip internal/advanced fields for the old UI
      const hidden = new Set(['spacingTop', 'spacingBottom', 'customClass', 'animation',
        'animationDelay', 'hideMobile', 'hideDesktop', 'sectionMaxWidth'])
      return !hidden.has(s.key)
    })
    .map(s => {
      const base: FieldDef = {
        key: s.key,
        label: s.label,
        type: 'text',
        placeholder: s.placeholder,
        help: s.hint,
      }

      // Map SettingDefinition types to old FieldType
      if (s.type === 'textarea') base.type = 'textarea'
      else if (s.type === 'color') base.type = 'color'
      else if (s.type === 'number' || s.type === 'range') base.type = 'number'
      else if (s.type === 'image_picker') base.type = 'url'
      else if (s.type === 'repeater') {
        base.type = 'list'
        if (s.itemSettings) {
          base.itemFields = s.itemSettings.map(is => ({
            key: is.key,
            label: is.label,
            type: is.type === 'image_picker' ? 'url'
                : is.type === 'textarea' ? 'textarea'
                : is.type === 'color' ? 'text'
                : 'text',
            placeholder: is.placeholder,
          }))
        }
      }

      // Override special picker types
      if (s.key === 'curatedIds') { base.type = 'product_picker'; base.help = base.help || 'Click "Pick products" to hand-select products' }
      if (s.key === 'curatedSlugs') { base.type = 'collection_picker'; base.help = base.help || 'Replace or reorder collections' }

      return base
    })
}

/**
 * Pre-computed map from section type → old-style FieldDef[].
 * Built from the canonical settings schema on import.
 */
function buildSchemaMap(): Record<string, FieldDef[]> {
  const types: SectionType[] = [
    'slideshow', 'brand_text', 'collection_grid', 'image_with_text',
    'image_bar', 'featured_products', 'reviews', 'instagram', 'cta',
    'newsletter', 'logo_bar', 'testimonial', 'stats_counter',
    'blog_posts', 'promo_bar', 'video_hero', 'lookbook', 'category_carousel',
    'footer_brand', 'footer_quick_links', 'footer_newsletter', 'footer_social',
  ]
  const map: Record<string, FieldDef[]> = {}
  for (const t of types) {
    const settings = getSectionSettings(t)
    if (settings && settings.length > 0) {
      map[t] = toFieldDefs(settings)
    }
  }
  return map
}

export const SECTION_SCHEMAS: Record<string, FieldDef[]> = buildSchemaMap()
