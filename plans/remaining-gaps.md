# Remaining Gaps — HomeU Commerce

> **Updated:** 2026-06-22
> **Status:** 54 active + 48 resolved = 102 total
> **Canonical source:** [`docs/GAP_LOG.md`](docs/GAP_LOG.md) (single source of truth)
> **Feature log:** [`docs/FEATURE_LOG.md`](docs/FEATURE_LOG.md) (all implemented features)

---

## Build Status

✅ **Preflight sweep passes clean** — 98 checkpoints, 0 blockers
✅ **TypeScript compilation** — 0 errors
✅ **Production build** — passes
✅ **Deploy gate** — committed + pushed to origin/master, verified

---

## 🔴 Critical (0)

✅ **All critical gaps resolved** — CRIT-004 (OTP exposed) was already fixed in code.

## 🟠 High (10)

| ID | Title | Impact |
|----|-------|--------|
| GAP-HIGH-012 | Security controls/regression coverage incomplete | 80+ API routes, no systematic auth/rate-limit tests |
| GAP-HIGH-013 | No persistent customer project workspace | High-consideration journeys reduced to temporary cart |
| GAP-HIGH-014 | No room fit/feasibility engine | Customers build infeasible proposals |
| GAP-HIGH-015 | No trade/designer project workspace | B2B customers must coordinate outside HomeU |
| GAP-HIGH-016 | RFQ/quotation follow-up not automated | Valuable intent goes cold |
| GAP-HIGH-017 | Discovery-to-revenue attribution incomplete | Cannot identify which actions create revenue |
| GAP-HIGH-018 | Room Passport / Project Twin not implemented | Fragmented capabilities across silos |
| GAP-HIGH-019 | Theme editor bypasses typed dynamic form | Users must know internal raw values |
| GAP-HIGH-020 | Theme mutations report success after failure | Data integrity risk on save/import |
| GAP-HIGH-021 | Many theme controls don't affect storefront output | Settings appear to save but don't render |
| GAP-HIGH-022 | Theme builder only builds homepage/header/footer | No template editing for other page types |

## 🟡 Medium (24)

| ID | Title | Status |
|----|-------|--------|
| GAP-MED-004 | No quotation PDF/print generator | 🟡 Active |
| GAP-MED-005 | Product variants/options not implemented | 🟡 Active |
| GAP-MED-008 | Customer dashboard RFQ history may be incomplete | 🟡 Active |
| GAP-MED-016 | 6 dead `DaVinciOS_*` tables in PostgreSQL schema | 🟡 Active |
| GAP-MED-022 | `homeu-schema.sql` contains 6 dead DaVinciOS tables | 🟡 Active |
| GAP-MED-023 | Deployer MCP SQL column named `DaVinciOS` | 🟡 Active |
| GAP-MED-025 | `.github/workflows/deploy.yml` DaVinciOS branding | 🟡 Active |
| GAP-MED-031 | `tools/cleanup-davincios.mjs` + `tools/rebrand/` dead scripts | 🟡 Active |
| GAP-MED-034 | `tools/build-and-deploy.mjs` dead DaVinciOS deletion commands | 🟡 Active |
| GAP-MED-035 | Admin media uploads save to local disk (not DO Spaces) | 🟡 Active |
| GAP-MED-036 | Chat lead lookup uses stub response | 🟡 Active |
| GAP-MED-037 | RFQ notification uses lead ID as customer name | 🟡 Active |
| GAP-MED-038 | Quotations lack approval/versioning/deposit flow | 🟡 Active |
| GAP-MED-039 | Product completeness/image quality not enforced | 🟡 Active |
| GAP-MED-040 | End-to-end coverage doesn't match platform surface | 🟡 Active |
| GAP-MED-041 | Global theme settings schema exceeds what can save/render | 🟡 Active |
| GAP-MED-042 | Footer settings don't match footer component props | 🟡 Active |
| GAP-MED-043 | Preview mode obscured / hides important empty states | 🟡 Active |
| GAP-MED-044 | Theme builder doesn't validate asset health | 🟡 Active |
| GAP-MED-045 | Responsive controls incomplete and untested | 🟡 Active |
| GAP-MED-046 | Section discovery/onboarding too technical | 🟡 Active |
| GAP-MED-047 | Inconsistent product photo backgrounds | 🟡 Active |
| GAP-MED-048 | 204 designer-tagged customers with no email skipped | 🟡 Active |

## 🔵 Low (20)

| ID | Title | Status |
|----|-------|--------|
| GAP-LOW-001 | Bank account details are placeholder text | 🔵 Active |
| GAP-LOW-002 | Viber number hardcoded as fallback | 🔵 Active |
| GAP-LOW-003 | Chatbot SQL schema not applied to live database | 🔵 Active |
| GAP-LOW-004 | `tools/theme-analyzer/component-map.md` missing | 🔵 Active |
| GAP-LOW-005 | Customer-sync bare catch blocks | 🔵 Active |
| GAP-LOW-006 | Login/register pages use inline styles | 🔵 Active |
| GAP-LOW-007 | Admin search/status filter UX inconsistency | 🔵 Active |
| GAP-LOW-008 | ChatWidget dual rendering paths | 🔵 Active |
| GAP-LOW-009 | `msgCounter` re-initialized each render | 🔵 Active |
| GAP-LOW-010 | `handleAutoLead` silent catch | 🔵 Active |
| GAP-LOW-011 | Bank details underscore placeholder | 🔵 Active |
| GAP-LOW-012 | ProductRecommendationCard `url` unused | 🔵 Active |
| GAP-LOW-013 | Viber number not clickable as `viber://` link | 🔵 Active |
| GAP-LOW-014 | Admin quotations edit page has no delete action | 🔵 Active |
| GAP-LOW-015 | `/quotation/[id]` back-link lacks context | 🔵 Active |
| GAP-LOW-019 | Homepage slideshow uses hardcoded Shopify CDN URLs | 🔵 Active |
| GAP-LOW-020 | Favicon still points to Shopify CDN | 🔵 Active |
| GAP-LOW-021 | Chat image uploads save to local disk | 🔵 Active |

---

## ✅ Resolved (48)

All 48 resolved gaps documented in [`docs/GAP_LOG.md`](docs/GAP_LOG.md) with full details.
Implemented features listed in [`docs/FEATURE_LOG.md`](docs/FEATURE_LOG.md).

**Recent resolutions (2026-06-22):**
- CRIT-004 (OTP security) — was already fixed in code, gap log was stale
- HIGH-010 (JWT fallback) — was already fixed in code, gap log was stale
- HIGH-011 (Password reset) — was already fixed in code, gap log was stale
- MED-006 (Bulk edit) — verified live (HTTP 204)
- MED-007 (Missing filters) — verified live (HTTP 200)
- MED-019 (Stale packages) — already cleaned by preflight sweep
- MED-020 (payloadcms-ui.tgz) — already cleaned by preflight sweep
- MED-024 (Docker tags) — already renamed to `homeu-website`

---

| Metric | Value |
|--------|-------|
| Total gaps | 102 |
| Active | 54 |
| Resolved | 48 |
| Build blockers | 0 |
| Preflight phases | 8 phases, 98 checks |
