# Theme Sections — Feature Reference

> **For humans:** Every section is a visual feature you can add, edit, and rearrange without code.
> **For AI agents:** Every section has a typed schema, API endpoint, and config preset. Use this file to auto-generate UI or automate theme building.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Theme Editor (/admin/theme)                                │
│  ┌──────────┐  ┌──────────────────────────────────────────┐│
│  │ Section   │  │  Live Preview (/?preview=N)              ││
│  │ Rail      │  │  ┌──────────────────────────────────┐   ││
│  │ ┌──────┐  │  │  │ [Header]       ← click to edit   │   ││
│  │ │Palette│  │  │  │ [Slideshow]    ← dblclick text   │   ││
│  │ ├──────┤  │  │  │ [Brand Text]   ← click image      │   ││
│  │ │Header │  │  │  │ [Collection]   ← drag to reorder │   ││
│  │ ├──────┤  │  │  │ [CTA]          ← hover: toolbar   │   ││
│  │ │ CSS   │  │  │  │ [+ Add here]                    │   ││
│  │ ├──────┤  │  │  └──────────────────────────────────┘   ││
│  │ │Footer │  │  └──────────────────────────────────────────┘│
│  │ ├──────┤  │                                              │
│  │ │S1  ✎  │  │  postMessage protocol:                     │
│  │ │S2  ✎  │  │  edit-text | pick-image | reorder | select  │
│  │ │S3  ✎  │  │                                              │
│  │ └──────┘  │                                              │
│  │ + Add     │                                              │
│  └──────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data flow
```
[Admin UI] ──PATCH──→ /api/theme/sections/:id ──→ homepage_sections (PostgreSQL)
[Preview]  ←──GET───  /?preview=N ──→ getHomepageSections() ──→ HomeSections.tsx
[Admin]    ←──postMessage── [Preview iframe] (click/dblclick/drag)
```

### Key files for AI agents
| File | Purpose |
|------|---------|
| `lib/theme-types.ts` | All section types, metadata (icons, labels, descriptions) |
| `app/admin/theme/theme-schemas.ts` | Per-section editable field schemas |
| `app/admin/theme/ThemeEditor.tsx` | The visual editor (section rail + preview + message handler) |
| `components/home/HomeSections.tsx` | Server-side section renderers |
| `components/home/PreviewBridge.tsx` | Client-side preview overlay (hover, click, drag, inline edit) |
| `app/api/theme/sections/route.ts` | CRUD API for sections |
| `app/api/theme/settings/route.ts` | Settings API (CSS, header, palette) |
| `lib/theme.ts` | Server data layer (DB queries, header settings) |

---

## All 22 Section Types

### Hero & Visual

| # | Type | Human label | What a human can do | Config keys |
|---|------|-------------|---------------------|-------------|
| 1 | `slideshow` | 🖼️ Slideshow | Add slides, set images, headings, buttons. Click image to replace. Dblclick text to edit. | `slides[]: {image, heading, subheading, buttonText, buttonLink}` |
| 2 | `video_hero` | 🎬 Video hero | Set MP4 video URL, poster image, overlay text + button. | `videoUrl, posterImage, heading, subheading, buttonText, buttonLink, overlayColor` |
| 3 | `image_with_text` | 📰 Image with text | Choose image, write title + description + CTA button. | `image, title, text, buttonText, buttonLink` |
| 4 | `image_bar` | 🎞️ Image bar | Add 2-3 images in a row with optional links. | `images[]: {image, link}` |
| 5 | `lookbook` | 👗 Lookbook | Shoppable collage grid. Each item has image, title, link, column/row span. | `heading, items[]: {image, title, link, colSpan, rowSpan}` |

### Brand & Story

| # | Type | Human label | What a human can do | Config keys |
|---|------|-------------|---------------------|-------------|
| 6 | `brand_text` | ✍️ Brand statement | Centered heading + paragraph. Dblclick to edit inline. | `title, body` |
| 7 | `testimonial` | 💬 Testimonials | Customer quote cards with avatar, name, role. | `heading, testimonials[]: {quote, author, role, avatar}` |
| 8 | `stats_counter` | 📊 Stats counter | Numbers row with labels. Edit numbers inline. | `heading, stats[]: {number, label, prefix}` |
| 9 | `logo_bar` | 🏢 Logo bar / Partners | Horizontal row of brand/partner logo images. | `heading, logos[]: {image, link, alt}` |

### Commerce

| # | Type | Human label | What a human can do | Config keys |
|---|------|-------------|---------------------|-------------|
| 10 | `collection_grid` | 🗂️ Shop by Collection | Grid of collection tiles. Auto-pulls from DB. Set heading + limit. | `heading, source (featured\|all), limit` |
| 11 | `featured_products` | ⭐ Featured pieces | Product grid from auto/newest or a specific collection. | `heading, source (auto\|collection), collectionSlug, limit` |
| 12 | `category_carousel` | 🔄 Category carousel | Horizontal scrolling collection tiles. | `heading, source (featured\|all), limit` |

### Conversion

| # | Type | Human label | What a human can do | Config keys |
|---|------|-------------|---------------------|-------------|
| 13 | `cta` | 📣 Call to action | Banner with heading, text, primary + secondary buttons. | `heading, text, bgColor, primaryText, primaryLink, secondaryText, secondaryLink` |
| 14 | `newsletter` | ✉️ Newsletter signup | Email capture form. Set heading, subtext, placeholder, button text, success message, background color. | `heading, subtext, placeholder, buttonText, bgColor, successMessage` |
| 15 | `promo_bar` | 📢 Promo bar | Sticky announcement bar at top. Set text, link, colors. | `text, link, bgColor, textColor` |

### Social & Community

| # | Type | Human label | What a human can do | Config keys |
|---|------|-------------|---------------------|-------------|
| 16 | `reviews` | 💬 Reviews | Judge.me review carousel. Set heading. | `heading` |
| 17 | `instagram` | 📸 Instagram | Instagram feed grid. Set handle + tile count. | `heading, handle, tiles` |
| 18 | `blog_posts` | 📝 Blog feed | Recent blog article grid or list. Set heading, limit, layout. | `heading, limit, layout (grid\|list)` |

### Footer

| # | Type | Human label | What a human can do | Config keys |
|---|------|-------------|---------------------|-------------|
| 19 | `footer_brand` | 🏪 Footer · Brand | Store name, tagline, address, email, phone. | `name, tagline, address1, city, country, email, phone` |
| 20 | `footer_quick_links` | 🔗 Footer · Quick Links | Navigation link list. Pulls from `navigation.json`. | `title` |
| 21 | `footer_newsletter` | ✉️ Footer · Newsletter | Email signup form in footer. | `title, description, placeholder, buttonText, successMessage` |
| 22 | `footer_social` | 📱 Footer · Social | Social media icon links. | `title, platforms[]: {name, url, label}` |

---

## Universal Section Controls

Every section has these, regardless of type:

| Control | Where | How |
|---------|-------|-----|
| **Enable/Disable** | Toggle checkbox in rail | `PATCH /api/theme/sections/:id { enabled: true/false }` |
| **Move up/down** | ▲▼ buttons in rail, toolbar in preview | Changes `position` in DB |
| **Drag reorder** | ⠿ handle in preview toolbar | `postMessage({ kind:'reorder', id, toIndex })` |
| **Duplicate** | "Duplicate" button in editor | Copies config to new section via POST |
| **Delete** | "Delete" button with confirm | `DELETE /api/theme/sections/:id` |
| **Spacing** | Above/Below px inputs in editor | `config.spacingTop`, `config.spacingBottom` |
| **Edit as code** | Toggle to raw JSON editor | Edits `config` as JSON textarea |

## Media System (image handling)

### For humans: Click any image in the preview → modal opens with 3 tabs:
1. **Upload** — drag-drop an image file → auto-uploads to CDN → inserts URL
2. **Browse** — pick from existing CDN media library
3. **URL** — paste any image URL

### For AI agents:
```
POST /api/admin/media/upload       — Upload file, returns { url }
GET  /api/admin/media?prefix=      — List CDN files
PATCH /api/theme/sections/:id      — Update config.image or config.slides[N].image
```

---

## Inline Editing Rules

| Element | Trigger | Action |
|---------|---------|--------|
| `[data-edit="key"]` | Dblclick | Opens contentEditable. Blur/Enter saves with `edit-text` postMessage. Auto-PATCHes to DB. |
| `[data-edit-image="path"]` | Click | Opens media picker modal. Select image → PATCHes config at path. |
| `[data-section-media="true"]` | — | Marks a container as containing editable media (for hover styling). |

### Dot-path format for nested fields
```
data-edit="title"                          → config.title
data-edit="slides.0.heading"               → config.slides[0].heading
data-edit-image="images.2.image"           → config.images[2].image
data-edit="testimonials.1.quote"           → config.testimonials[1].quote
```

---

## Theme Palette (global brand settings)

Editable in Theme Editor → Theme Palette panel. Injected as CSS custom properties:

```css
:root {
  --theme-primary: #1a6d3e;       /* Buttons, links, accents */
  --theme-secondary: #d4a853;     /* Highlights, badges */
  --theme-accent: #151a17;        /* Dark backgrounds, text */
  --theme-heading-font: 'Playfair Display', serif;
  --theme-body-font: 'Inter', sans-serif;
  --theme-button-radius: 6px;
}
```

Stored as `site_settings` keys: `theme_primaryColor`, `theme_secondaryColor`, etc.
API: `PUT /api/theme/settings { key: 'theme_primaryColor', value: '#1a6d3e' }`

---

## Header Settings

Editable in Theme Editor → Header panel.

| Setting | Key | Values |
|---------|-----|--------|
| Logo URL | `logoUrl` | Any image URL |
| Logo max width | `logoMaxWidth` | px number |
| Sticky header | `sticky` | true/false |
| Font family | `fontFamily` | CSS font stack |
| Nav font size | `navFontSize` | px number |
| Background color | `bgColor` | hex color |
| Text color | `textColor` | hex color |
| Icons position | `iconsPosition` | `right` / `left` / `top-bar` |
| Logo layout | `layout` | `logo-center` / `logo-left` |
| Announcement bar | `announcement` | `{ enabled, text, link, bgColor, textColor }` |

Stored as `site_settings` key: `header_settings` (JSONB).
API: `PUT /api/theme/settings { key: 'header_settings', value: {...} }`

---

## Custom CSS

Editable in Theme Editor → Custom CSS panel. Injected site-wide.

Stored as `site_settings` key: `custom_css`.
API: `PUT /api/theme/settings { key: 'custom_css', value: '.my-class { ... }' }`

---

## Quick Reference for AI Agents

### Add a section programmatically
```bash
curl -X POST /api/theme/sections \
  -H 'Content-Type: application/json' \
  -d '{"type":"brand_text","config":{"title":"Hello","body":"World"}}'
```

### Update a section
```bash
curl -X PATCH /api/theme/sections/42 \
  -H 'Content-Type: application/json' \
  -d '{"config":{"title":"New Title"}}'
```

### Reorder sections
```bash
curl -X PUT /api/theme/sections \
  -H 'Content-Type: application/json' \
  -d '{"order":[42, 17, 53, 8]}'
```

### Delete a section
```bash
curl -X DELETE /api/theme/sections/42
```

### Get all sections
```bash
curl /api/theme/sections
# Returns: { sections: [{ id, type, position, enabled, config }] }
```
