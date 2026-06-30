# Online Store Audit

Last audited: 2026-06-30

## Covered

- Admin navigation exposes Content > Online Store.
- Online Store page requires an admin session through the admin layout/page guard.
- `/api/admin/online-store/themes` requires an admin session for list and mutations.
- Live desktop theme is seeded from the current storefront the first time the library is opened.
- Desktop drafts can be created, duplicated, renamed, deleted, imported, exported, and published.
- Mobile drafts can be created, duplicated, renamed, deleted, imported, and exported without replacing the live desktop theme.
- A separate live mobile theme is seeded from the desktop live theme and appears as its own editable Online Store row.
- Mobile visitors receive the live mobile snapshot for sections, footer, header settings, palette, and custom CSS.
- The mobile live theme and mobile drafts can be opened in the snapshot editor without mutating the desktop live theme.
- Mobile drafts can be promoted to the live mobile theme, and the previous mobile live theme is preserved as an unpublished draft.
- Imported themes are saved as unpublished drafts and validate the required snapshot shape before insert.
- Deploy flow runs pending database migrations before rebuilding the website container.

## Fixed In This Pass

- Added JSON import from exported full-theme payloads or bare theme snapshots.
- Added server-side import validation so malformed JSON cannot write partial theme rows.
- Added user-level `400` responses for invalid import and mobile-publish attempts.
- Added visible import/export controls instead of leaving import as a future placeholder.
- Added the `mobile_live` theme role with a database uniqueness guard.
- Added `/admin/online-store/themes/[id]` so the current live mobile theme can be viewed and edited.
- Added per-theme GET/PATCH APIs for saving snapshot name, settings, sections, and performance data.
- Wired mobile runtime selection so phone user agents render the live mobile snapshot while desktop visitors keep using the desktop live tables.
- Fixed a chat-widget SSR crash caused by reading `window.location.search` during server render.

## Fixed In Theme Sync Bridge (2026-06-30)

- **`/admin/theme?themeId=N`** — visual Theme Builder now loads from and saves to any `store_themes` snapshot, not just live tables. Only `homepage_sections` edits were possible before.
- **Draft-aware editor** — when `themeId` is set, the "Publish to Live" button appears, calling `publishStoreTheme()` to publish the draft. The "Save Theme" button saves back to the snapshot JSONB instead of `homepage_sections`.
- **`POST /api/theme/sync-snapshot`** — background endpoint that calls `syncLiveStoreThemeSnapshot()` after every live save, keeping the live `store_themes` row always synced.
- **"Open in Theme Builder" button** — desktop drafts in OnlineStoreClient + ThemeSnapshotEditor now have a direct link to `/admin/theme?themeId=N`.
- **Visual diff** — each desktop draft row has a "Show changes" button that computes a `computeThemeDiff(liveSnapshot, draftSnapshot)` and displays added/removed/changed sections with a collapsible details list. Helps prevent blind publish.
- **Section type validation** — `importStoreTheme()` now validates every section type against `SECTION_TYPES` before accepting an import, matching the Theme Builder's import validation.

## Remaining Feature Gaps

- Page-speed cards currently show the manually provided LCP/INP values. A future pass should ingest real rolling metrics from `performance_metrics` or CrUX/PageSpeed.
- Draft preview route that renders a snapshot without publishing (mobile drafts already work; desktop drafts would need a similar dedicated route).
- Replace manual LCP/INP values with a scheduled metrics collector.
