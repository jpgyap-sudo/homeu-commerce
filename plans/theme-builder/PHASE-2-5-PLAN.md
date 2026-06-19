# HomeU Theme Builder — Phases 2–5 Implementation Plan

> **Status as of 2026-06-19:** ✅ Phase 2 (inline text), ✅ Phase 3 (image picker), ✅ Phase 4 (drag reorder), ✅ Phase 5 (header layout) — all shipped.
> See `tools/theme-analyzer/section-features.md` for the complete feature reference.

Handoff doc for a coding agent. Goal: evolve the DaVinciOS Theme editor
(`/admin/theme`) into a Shopify-customizer-style **visual builder** with
inline editing, image replacement, drag reordering, and header layout control.

✅ Phase 1 (in-preview Edit / Move ▲▼ toolbar) — shipped
✅ Phase 2 (inline text editing with dblclick) — shipped 2026-06-19
✅ Phase 3 (image picker with upload/browse/paste modal) — shipped 2026-06-19
✅ Phase 4 (drag reorder in preview) — shipped 2026-06-19
✅ Phase 5 (header layout + announcement bar) — shipped 2026-06-19

---

## 0. Current Architecture (as of this handoff)

### Concept
The storefront homepage is a DB-driven, ordered list of **typed sections**.
The admin edits them in a split view: a **section rail** (left) + a **live
preview iframe** of the real storefront homepage (right). Preview ↔ admin talk
over `postMessage`.

### Data model (PostgreSQL)
- `homepage_sections(id, type, position, enabled, config JSONB, updated_at)`
  - `type` ∈ slideshow | brand_text | collection_grid | image_with_text |
    image_bar | featured_products | reviews | instagram | cta | (newer ones
    the team added: newsletter, logo_bar, testimonial, stats_counter,
    blog_posts, promo_bar, video_hero, lookbook, category_carousel)
  - `config` is free-form per type; also supports universal keys
    `spacingTop` / `spacingBottom` (px, applied to the section wrapper).
- `site_settings(key PK, value JSONB, updated_at)`
  - keys in use: `nav_main`, `nav_footer`, `custom_css`, `header_settings`
  - `header_settings`: `{ logoUrl, logoMaxWidth, bgColor, textColor, sticky,
    fontFamily, navFontSize }`

### Key files
| File | Role |
|---|---|
| `apps/website/src/lib/theme.ts` | server data layer: `getHomepageSections`, `getCustomCss`, `getHeaderSettings`, `HEADER_FONTS` |
| `apps/website/src/lib/theme-types.ts` | shared types + `SECTION_META`, `SECTION_TYPES` (client-safe, no DB import) |
| `apps/website/src/app/admin/theme/page.tsx` | server: auth + initial fetch → `<ThemeEditor>` |
| `apps/website/src/app/admin/theme/ThemeEditor.tsx` | the editor (client): rail, preview iframe, save-all, undo/redo, resize, header panel, css panel, message listener |
| `apps/website/src/app/admin/theme/theme-schemas.ts` | per-type editable field schema that auto-renders forms |
| `apps/website/src/components/home/HomeSections.tsx` | server: renders each section by type; wraps each in `<div data-section-id data-section-type data-section-label>` and mounts `<PreviewBridge>` when `preview` |
| `apps/website/src/components/home/PreviewBridge.tsx` | client, **iframe-only**: hover outline + toolbar, posts selections/actions to parent |
| `apps/website/src/app/page.tsx` | reads `?preview` searchParam → `<HomeSections preview>` |
| `apps/website/src/app/api/theme/sections/route.ts` | GET all / POST add / PUT reorder |
| `apps/website/src/app/api/theme/sections/[id]/route.ts` | PATCH (config/enabled) / DELETE |
| `apps/website/src/app/api/theme/settings/route.ts` | GET/PUT site_settings (`custom_css`, `header_settings`; extend `ALLOWED` for new keys) |
| `apps/website/src/styles/debut-overrides.css` | storefront CSS incl. `.homeu-preview-*` overlay styles |

### postMessage protocol (already implemented)
- **preview → admin**: `{ source:'homeu-preview', kind:'select', id, sectionType }`
  and `{ source:'homeu-preview', kind:'action', action:'edit'|'up'|'down', id }`
  (`id` is a number, or the string `'header'`).
- **admin → preview**: `{ source:'homeu-admin', kind:'highlight', id }`.
- The preview activates only inside an iframe (`window.parent !== window`).
- The preview reflects the **saved DB state**; the iframe reloads (key bump)
  on save. Unsaved local edits in the rail do **not** appear in the preview
  until "Save Theme".

### Auth / API conventions
- GET theme endpoints are public; POST/PUT/PATCH/DELETE require `getSession()`
  (`apps/website/src/lib/auth.ts`). New mutating endpoints must check it.
- DB access via `query()` from `apps/website/src/lib/db.ts` (`pg`).
- Two databases must stay in sync: local dev (`superroo2-postgres-1` container,
  db `homeu`) and VPS (`homeu-commerce-postgres-1` via SSH key
  `~/.ssh/id_superroo_vps`, host `100.64.175.88`). Schema/seed changes: run on
  both. Code reads work off whichever `DATABASE_URI` the app uses.

### Hard rules (from CLAUDE.md)
- Call the CMS **DaVinciOS** (never "Payload").
- Storefront fidelity: reuse the existing Debut CSS class names.
- Run `node tools/shared/preflight-sweep.mjs --full` before any build/deploy.
- CDN media lives on DO Spaces (`homeatelierspaces`, region sgp1). Never commit
  `DO_SPACES_*` secrets. Don't touch the live Shopify store.

---

## Phase 2 — Inline text editing (HIGH priority, "frictionless" win)

**Goal:** double-click an editable text node in the preview (section headings,
paragraphs, button labels, slide captions) → it becomes editable in place →
blur/Enter saves to that section's `config`.

### Approach
1. **Mark editable text in renderers.** In `HomeSections.tsx`, where a section
   prints a config-backed string, add `data-edit="<configKey>"` to the element.
   Example for `brand_text`:
   ```tsx
   <h2 className="homepage-brand-text__title h2" data-edit="title">{cfg.title}</h2>
   <p className="homepage-brand-text__body" data-edit="body">{cfg.body}</p>
   ```
   For list-backed text (slides, testimonials) use a path:
   `data-edit="slides.0.heading"`.
2. **PreviewBridge: enable inline editing.** When `preview`, on `dblclick` of an
   element with `[data-edit]` inside a `[data-section-id]`:
   - set `el.contentEditable = 'true'`, focus, select.
   - on `blur` or `Enter` (preventDefault), read `el.innerText`, then
     `postMessage({ source:'homeu-preview', kind:'edit-text', id, path, value })`.
   - set `contentEditable='false'`.
   - Suppress the normal single-click "select" while editing.
3. **ThemeEditor: apply + persist.** Handle `kind:'edit-text'`: update
   `sections[id].config` at `path` (support dot-paths incl. array indices),
   `setDirty(true)`, and **PATCH immediately** so the preview (which reloads
   from DB) stays consistent — OR update an in-iframe optimistic value and only
   PATCH on Save. Recommended: PATCH immediately + no iframe reload (avoid
   losing caret); just trust the contentEditable value already shown.
4. **Path helper.** Add `setByPath(obj, 'slides.0.heading', value)` util.

### Files
- `HomeSections.tsx` (add `data-edit` attributes — the bulk of the work)
- `PreviewBridge.tsx` (dblclick → contentEditable → message)
- `ThemeEditor.tsx` (handle `edit-text`, path setter, PATCH)
- `debut-overrides.css` (`.homeu-preview [contenteditable]{outline:2px solid #1e7a47;}`)

### Gotchas
- contentEditable can inject `<div>`/`<br>` — read `innerText`, not `innerHTML`,
  for plain-text fields. Rich fields (description-like) are out of scope here.
- The global click handler in PreviewBridge calls `preventDefault` — make sure
  dblclick/editing isn't swallowed; gate the select handler when an element is
  being edited (`if (document.querySelector('[contenteditable="true"]')) return`).
- Numeric/URL fields should stay in the rail forms, not inline.

### Acceptance
- Double-click the brand heading in preview, type, blur → rail shows new value,
  DB updated, refresh persists. No caret jiggle, no nav/select interference.

---

## Phase 3 — Click image to replace (MEDIUM)

**Goal:** click an image in the preview → a picker opens in the admin → choose
a DO Spaces image or paste a URL → the section `config` image field updates.

### Approach
1. **Mark images.** In `HomeSections.tsx`, add `data-edit-image="<path>"` to
   `<Image>`/`<img>` whose src comes from config (slideshow `slides.N.image`,
   `image_with_text.image`, `image_bar.images.N.image`, logos, etc.).
2. **PreviewBridge.** On click of `[data-edit-image]` (single click, but treat
   as image-action not section-select): `postMessage({ kind:'pick-image', id,
   path })`.
3. **ThemeEditor.** On `pick-image`, open a **MediaPicker** modal:
   - Tab A: paste URL.
   - Tab B: browse DO Spaces (reuse `/admin/media` data or add
     `GET /api/admin/media?prefix=cdn-mirror/` backed by the `do-spaces` MCP /
     S3 list; the bucket is read-only by default).
   - Tab C (optional): upload — POST to a new `/api/admin/media/upload` that
     puts to DO Spaces (`cdn-mirror/<sha256>.<ext>`, ACL public-read) using the
     `@aws-sdk/client-s3` pattern in `tools/shopify-import/mirror-db-assets.mjs`.
     Requires enabling write creds server-side; keep secrets in env.
   - On select, `setByPath(config, path, url)`, PATCH, refresh preview.

### Files
- `HomeSections.tsx` (data-edit-image attrs)
- `PreviewBridge.tsx` (image click → message)
- `ThemeEditor.tsx` + new `MediaPicker.tsx`
- new `apps/website/src/app/api/admin/media/route.ts` (list) and optionally
  `.../upload/route.ts` (put)

### Gotchas
- Reuse the content-addressed `cdn-mirror/<sha256>` scheme so uploads dedupe.
- Don't expose write keys to the client; uploads go through the API route.
- Respect existing `MCP_S3_EXT_READONLY` posture — uploads need a separate
  server-side credential path, documented in CLAUDE.md.

### Acceptance
- Click a slide image → pick a new one → preview shows it after save; URL stored
  in `config.slides[N].image`.

---

## Phase 4 — Drag-to-reorder sections in the preview (MEDIUM-HIGH)

**Goal:** drag a section up/down within the preview to reorder (vs. ▲▼).

### Approach
- Add a drag handle to the PreviewBridge toolbar (`⠿`). On `mousedown`, start a
  drag: track pointer Y, compute the target index by comparing against the
  `getBoundingClientRect().top` midpoints of all `[data-section-id]` blocks,
  show a drop indicator line.
- On drop, `postMessage({ kind:'reorder', from:<id>, toIndex:<n> })`.
- ThemeEditor reorders `sections` accordingly, `setDirty(true)`. Persist order
  on Save (existing `PUT /api/theme/sections { order }`), or PATCH order
  immediately + reload preview.
- Auto-scroll the iframe when dragging near top/bottom edges.

### Files
- `PreviewBridge.tsx` (drag logic, drop indicator)
- `ThemeEditor.tsx` (`reorder` handler)
- `debut-overrides.css` (`.homeu-preview-dropline`)

### Gotchas
- The iframe has its own scroll; compute positions in iframe coordinates.
- Keep ▲▼ as the accessible fallback.
- Disesgage the hover-outline logic during an active drag.

### Acceptance
- Drag "Featured pieces" above "Shop by Collection"; release; order updates in
  rail + preview; persists after Save.

---

## Phase 5 — Header layout / region model (HIGH value, MEDIUM)

**Goal:** make the header configurable (e.g. move search/account icons), since
"move anywhere" isn't free pixels — it's a **slot model**.

### Approach
1. Extend `header_settings` with:
   - `iconsPosition`: `'right' | 'left' | 'top-bar'` (separate utility row).
   - `layout`: `'logo-center' | 'logo-left'`.
   - `announcement`: `{ enabled, text, link, bgColor, textColor }` (top promo bar).
2. `SiteHeader.tsx`: render variants from these settings; reuse Debut classes.
   For `top-bar`, render a thin flex row above the logo row with icons right.
3. `ThemeEditor.tsx` Header panel: add selects for `iconsPosition`, `layout`,
   and an announcement sub-form. Clicking the header in preview already opens
   this panel (`kind:'select', id:'header'`).
4. Inject any needed CSS via the existing `headerCss` builder in
   `apps/website/src/app/layout.tsx`.

### Files
- `apps/website/src/lib/theme.ts` (extend `HeaderSettings` + defaults)
- `apps/website/src/components/SiteHeader.tsx` (variants)
- `apps/website/src/app/layout.tsx` (CSS injection, pass props)
- `apps/website/src/app/admin/theme/ThemeEditor.tsx` (Header panel controls)
- `apps/website/src/app/api/theme/settings/route.ts` (already allows
  `header_settings`)

### Acceptance
- Switch icons to "top utility bar"; the storefront header shows a separate top
  row with right-aligned icons; logo/nav stay aligned.

---

## Cross-cutting notes

- **State source of truth:** the preview iframe reads the **DB**. Any "live"
  inline edit must either PATCH immediately or be applied optimistically inside
  the iframe; a naive iframe reload on every keystroke will kill the caret. Pick
  per-phase as noted.
- **Stale closures:** `ThemeEditor`'s message `useEffect` runs once (`[]`). Use
  **functional** `setSections(prev => …)` updates inside handlers (see the
  Phase-1 move handler already doing this) to avoid stale `sections`.
- **TypeScript:** `npx tsc --noEmit` in `apps/website` must stay clean.
- **Two DBs:** ship schema/seed to both local + VPS (see "Auth / API").
- **Don't break public output:** all `data-edit*` attributes and PreviewBridge
  only render/activate when `?preview` is present and inside an iframe; the
  public homepage must stay clean and crawlable.
- **Security:** keep `postMessage` non-sensitive (ids/paths/values only); the
  iframe is same-origin, so an origin check can be added if desired.

## Suggested order
Phase 2 → Phase 5 → Phase 3 → Phase 4 (text editing and header give the most
perceived "builder" value fastest; drag is the most fiddly).
