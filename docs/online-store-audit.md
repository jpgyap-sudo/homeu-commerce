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

## Remaining Feature Gaps

- Draft-specific editing now has a JSON snapshot editor, but it is not yet the full visual drag/drop Theme Editor experience.
- Desktop draft editing still needs the same visual editor bridge that mobile now has at the snapshot level.
- Page-speed cards currently show the manually provided LCP/INP values. A future pass should ingest real rolling metrics from `performance_metrics` or CrUX/PageSpeed.
- Import has validation for shape, but it does not yet whitelist section types against `SECTION_TYPES`.
- There is no visual diff between a draft and the live theme before publishing.

## Recommended Next Build

- Add `/admin/theme?themeId=...` draft editing that reads/writes `store_themes.snapshot`.
- Add a draft preview route that renders a snapshot without mutating live tables.
- Add visual controls on top of the snapshot editor for common mobile edits: header logo sizing, hero image, menu density, and sticky CTA behavior.
- Replace manual LCP/INP values with a scheduled metrics collector.
