/**
 * GET /api/theme/settings-schema
 *
 * Returns the full settings schema for all section types and global settings.
 * The admin Theme editor uses this to auto-render form controls — color pickers,
 * image pickers, sliders, text inputs, etc.
 *
 * Response shape:
 * {
 *   sections: Record<SectionType, SettingDefinition[]>,
 *   global: SettingDefinition[],
 *   meta: Record<SectionType, { label, icon, description }>
 * }
 */

import { NextResponse } from 'next/server'
import SECTION_SETTINGS_SCHEMA, { getGlobalSettings } from '@/lib/theme-builder-settings'
import { SECTION_META } from '@/lib/theme-types'

export async function GET() {
  return NextResponse.json({
    sections: SECTION_SETTINGS_SCHEMA,
    global: getGlobalSettings(),
    meta: SECTION_META,
  })
}
