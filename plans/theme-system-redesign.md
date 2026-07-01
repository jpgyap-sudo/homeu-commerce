# Theme System Redesign — Architectural Plan

## Current State Problems

1. **"Theme" is buried** under Content section in sidebar alongside "Online Store" (two separate but related pages)
2. **ThemeEditor.tsx is 2184 lines** — monolithic, hard to maintain
3. **No logical theming tabs** — customer account theme lives under Online Store snapshots, not Theme
4. **Mobile theme** is handled via `store_themes` with `device_scope='mobile'` but has no dedicated admin UI
5. **No product page theming** — product_details and product_grid settings exist in theme-builder-settings.ts but only accessible through the generic section editor

## Target Sidebar Structure

```
THEME (new top-level section)
├── 🏠 Homepage    → /admin/theme/homepage
├── 📦 Product     → /admin/theme/product
├── 👤 Account     → /admin/theme/account
├── 📱 Mobile      → /admin/theme/mobile
└── 🎨 Global      → /admin/theme/global
```

## Architecture Changes

### 1. AdminShell.tsx — Add Theme Section

Add a new top-level section between "Content" and "Insights":

```typescript
{
  id: 'theme', label: 'Theme', icon: '◭',
  links: [
    { href: '/admin/theme/homepage', icon: '🏠', label: 'Homepage' },
    { href: '/admin/theme/product', icon: '📦', label: 'Product' },
    { href: '/admin/theme/account', icon: '👤', label: 'Account' },
    { href: '/admin/theme/mobile', icon: '📱', label: 'Mobile' },
    { href: '/admin/theme/global', icon: '🎨', label: 'Global' },
  ],
}
```

Remove `/admin/theme` from Content section. Remove the full-bleed check for `/admin/theme`.

### 2. New File Structure

```
apps/website/src/app/admin/theme/
├── layout.tsx              → ThemeLayout with tabs/sub-navigation (replaces full-bleed)
├── page.tsx                → Redirect to /admin/theme/homepage
├── homepage/
│   ├── page.tsx            → Extracted homepage section builder from ThemeEditor
│   └── HomepageEditor.tsx  → Section-level editing (add/reorder/configure sections)
├── product/
│   └── page.tsx            → Product page settings (product_details + product_grid)
├── account/
│   └── page.tsx            → Customer account portal theme editor
├── mobile/
│   └── page.tsx            → Mobile theme editor (mobile-specific sections + nav style)
└── global/
    └── page.tsx            → Palette, typography, buttons, layout, custom CSS
```

### 3. Component Breakdown

#### ThemeLayout (NEW — `layout.tsx`)
- Horizontal tab bar at top: Homepage | Product | Account | Mobile | Global
- Each tab highlights based on current route
- Page preview iframe (can be shared or per-tab)
- Save/publish buttons in a consistent top bar

#### HomepageEditor (EXTRACTED from ThemeEditor.tsx lines 1-~800)
- Template selector (index, product, collection)
- Section add/remove/reorder
- Section settings panel (existing DynamicSettingsForm)
- Live preview iframe
- Save to draft → publish workflow

#### ProductEditor (NEW — uses existing product_details + product_grid settings)
- Product details page settings (breadcrumbs, SKU visibility, gallery width, zoom)
- Collection/product grid settings (columns, filters, sort, pagination)
- Preview via iframe to a product page

#### AccountEditor (MOVED from /admin/online-store/themes/[id]/ThemeSnapshotEditor)
- Dashboard layout (classic vs concierge)
- Color scheme (surface, panel, text, accent, border)
- Card style, nav style, density
- Welcome label
- Live preview

#### MobileEditor (NEW — dedicated mobile UI)
- Mobile nav style (tabs vs debut)
- Bottom bar customization
- Mobile-specific sections
- Mobile hero/quick-actions
- Preview in mobile viewport

#### GlobalEditor (EXTRACTED from ThemeEditor.tsx CSS/palette sections)
- Theme palette (primary, secondary, accent colors)
- Typography (heading + body fonts)
- Buttons (radius, style, uppercase)
- Layout (max width, section gap)
- Custom CSS textarea
- Favicon

### 4. Data Flow

```
[Admin UI Tab] → fetch('/api/admin/theme/[tab]') → Server queries site_settings/store_themes → Returns config
                ↓
[User edits] → POST/PATCH to same API → Updates site_settings OR store_themes snapshot → 
                ↓
[Storefront] → getThemePalette()/getHeaderSettings() etc. → Reads from site_settings → Renders CSS variables
```

### 5. API Routes Needed

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/theme/homepage` | GET/PUT | Sections CRUD for homepage templates |
| `/api/admin/theme/product` | GET/PUT | Product page settings |
| `/api/admin/theme/account` | GET/PUT | Customer account theme |
| `/api/admin/theme/mobile` | GET/PUT | Mobile theme settings |
| `/api/admin/theme/global` | GET/PUT | Global palette + typography + CSS |
| `/api/admin/theme/quotation` | GET/PUT | Quotation PDF template branding |
| `/api/admin/theme/publish` | POST | Publish theme snapshot |

### 6. Reverse-Engineering All Themes to Be Editable

The existing system already has:
- `theme-builder-settings.ts` — complete setting schemas for every section type
- `theme-styles.ts` — runtime CSS generation from settings
- `theme-types.ts` — section type registry

What needs to be added for full no-code editability:

**Product Page:**
- Product details component already has settings in `product_details` schema
- Product grid has settings in `product_grid` schema
- Need to surface these in a dedicated Product tab with live preview

**Customer Account:**
- `customer-account-theme.ts` already has full theme interface
- ThemeSnapshotEditor exists but is buried under Online Store
- Move to Theme > Account tab with better preview

**Mobile:**
- `getMobileNavStyle()` already exists
- Mobile theme snapshot exists in `store_themes`
- Need a dedicated editor that exposes mobile-specific settings

**Global:**
- `getGlobalSettings()` already defined in theme-builder-settings.ts
- Need to surface all global settings in a proper form
- Custom CSS textarea already exists

### 7. Migration Strategy

1. Create new ThemeLayout with tab navigation
2. Extract homepage section editor from ThemeEditor.tsx into /admin/theme/homepage/
3. Create Product, Account, Mobile, Global tabs as new pages
4. Move customer account theme from Online Store to Theme > Account
5. Keep old /admin/theme route as redirect to /admin/theme/homepage
6. Add new Theme section to sidebar
7. Remove old "Theme" link from Content section
8. Remove full-bleed check once all pages work with sidebar

### 8. Proposed Tab Icons & Order

| Tab | Icon | Purpose |
|-----|------|---------|
| Homepage | 🏠 | Homepage sections, promo bar, header, footer |
| Product | 📦 | Product details page + collection/product grid |
| Account | 👤 | Customer account dashboard + login page |
| Mobile | 📱 | Mobile-specific nav, bottom bar, hero |
| Global | 🎨 | Palette, typography, buttons, layout, CSS |
| Quotation | 📄 | Quotation PDF template, brand colors, layout |
| Advanced | ⚙️ | Custom CSS, scripts, performance settings |

### 9. Additional Theme Tabs (Bonus Ideas)

| Tab | Why |
|-----|-----|
| **Checkout** | RFQ/Quote flow customization — button text, colors, layout |
| **Email** | Email template branding — logo, header/footer, button styles for automated emails |
| **Footer** | Dedicated footer editor (currently handled as sections with type `footer_*`) |
| **Header** | Already has header_settings — could be its own tab for logo, nav, announcement bar |

### 10. Implementation Phases

**Phase 1: Structure** (this task)
- Create theme layout with tabs
- Add sidebar section
- Set up routing

**Phase 2: Extract**
- Move homepage editor from ThemeEditor.tsx
- Move account theme from Online Store

**Phase 3: Build**
- Product page theme tab
- Mobile theme tab
- Global theme tab
- Publish workflow
