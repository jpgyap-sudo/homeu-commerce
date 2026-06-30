# Online Store Audit

Last audited: 2026-06-30

## Covered

- Admin navigation exposes Content > Online Store.
- Online Store page requires an admin session through the admin layout/page guard.
- `/api/admin/online-store/themes` requires an admin session for list and mutations.
- Live desktop theme is seeded from the current storefront the first time the library is opened.
- Desktop drafts can be created, duplicated, renamed, deleted, imported, exported, and published.
- Mobile drafts can be created, duplicated, renamed, deleted, imported, and exported without replacing the live desktop theme.
- Imported themes are saved as unpublished drafts and validate the required snapshot shape before insert.
- Deploy flow runs pending database migrations before rebuilding the website container.

## Fixed In This Pass

- Added JSON import from exported full-theme payloads or bare theme snapshots.
- Added server-side import validation so malformed JSON cannot write partial theme rows.
- Added user-level `400` responses for invalid import and mobile-publish attempts.
- Added visible import/export controls instead of leaving import as a future placeholder.

## Remaining Feature Gaps

- Draft-specific editing is not yet wired. The existing Theme Editor edits the current live `homepage_sections` and `site_settings` tables, not a selected `store_themes.snapshot`.
- Mobile runtime rendering is not device-aware yet. Mobile theme drafts are safely stored separately, but the storefront does not switch to a mobile snapshot for phone visitors.
- Page-speed cards currently show the manually provided LCP/INP values. A future pass should ingest real rolling metrics from `performance_metrics` or CrUX/PageSpeed.
- Import has validation for shape, but it does not yet whitelist section types against `SECTION_TYPES`.
- There is no visual diff between a draft and the live theme before publishing.

## Recommended Next Build

- Add `/admin/theme?themeId=...` draft editing that reads/writes `store_themes.snapshot`.
- Add a draft preview route that renders a snapshot without mutating live tables.
- Add device-aware storefront selection for mobile snapshots after the mobile editor can save draft-specific changes.
- Replace manual LCP/INP values with a scheduled metrics collector.
