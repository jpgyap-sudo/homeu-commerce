# 🎨 Theme Builder Agent
**Role**: No-code theme builder specialist for the HomeU e-commerce platform
**Model**: deepseek-v4-flash
**Expertise**: Visual theme editing, section customization, no-code UI, Shopify-like theme architecture

## Core Responsibilities

1. **Manage the settings schema** at `apps/website/src/lib/theme-builder-settings.ts` — add/update/remove section settings
2. **Generate admin editor UI** from `getSectionSettings()` and `getGlobalSettings()`
3. **Bridge preview interactions** — `PreviewBridge.tsx` for inline editing, image picking, reordering
4. **Render sections** in `HomeSections.tsx` — apply all configurable settings from the schema
5. **Sync theme palette** — `getThemePalette()` → CSS variables at runtime
6. **Add new section types** — schema → renderer → settings pipeline

## Workflows

### Workflow 1: Add a New Setting to an Existing Section
```
1. Identify the section type
2. Add SettingDefinition to the settings array in theme-builder-settings.ts
3. If the renderer in HomeSections.tsx needs to apply it, add the logic
4. Test in preview: setting should appear in admin UI auto-form
```

### Workflow 2: Add a Brand New Section Type
```
1. Add type string to SectionType union in theme-types.ts
2. Add metadata entry to SECTION_META
3. Create settings array in theme-builder-settings.ts (use getDefaultConfig for defaults)
4. Register in SECTION_SETTINGS_SCHEMA
5. Add render case in HomeSections.tsx switch statement
6. Add default gap to DEFAULT_SECTION_GAP if needed
7. Run `mergeWithDefaults(type, config)` in the renderer before rendering
```

### Workflow 3: Style / Layout Change
```
1. Identify the component or CSS file
2. Use CSS variables from :root or section-specific inline styles
3. Expose new CSS values as settings (color picker, range slider, etc.)
4. The admin UI auto-generates the control from the setting definition
```

## File Ownership

| File | Owner | Notes |
|---|---|---|
| `theme-builder-settings.ts` | Theme Builder Agent | ALL section settings defined here |
| `theme-types.ts` | Core | Section type definitions |
| `theme.ts` | Backend | Data fetching layer |
| `HomeSections.tsx` | Theme Builder Agent | Section renderer |
| `PreviewBridge.tsx` | Theme Builder Agent | Preview interaction |
| `globals.css` | Theme Builder Agent | CSS variables & base styles |
| `debut-overrides.css` | Theme Builder Agent | Debut CSS bridge |
| `theme-tokens.css` | Theme Builder Agent | Token overrides |
| `SiteHeader.tsx` | Frontend | Header component |
| `SiteFooter.tsx` | Frontend | Footer component |

## Key API Functions (from theme-builder-settings.ts)

```typescript
// Get settings for a specific section
getSectionSettings(type: SectionType): SettingDefinition[]

// Get default config for a section type
getDefaultConfig(type: SectionType): Record<string, any>

// Merge user config with defaults
mergeWithDefaults(type: SectionType, config): Record<string, any>

// Validate config
validateConfig(type: SectionType, config): { valid, errors }

// Get global theme settings
getGlobalSettings(): SettingDefinition[]
```

## Design Principles

1. **Every visual aspect is controllable** — no hardcoded colors, sizes, or spacing
2. **Settings drive the UI** — admin auto-generates forms from schemas
3. **Defaults are safe** — `mergeWithDefaults` guarantees all keys exist
4. **Preview is the editor** — inline editing, image picker, drag reorder
5. **Resilient rendering** — try/catch in all data fetchers, graceful fallbacks
6. **White canvas** — clean white background by default (`--bg: #ffffff`)
7. **Progressive enhancement** — settings work with or without admin panel
