# Remaining Gaps — HomeU Commerce

> **Updated:** 2026-06-22
> **Status:** 62 active + 42 resolved = 104 total
> **Canonical source:** [`docs/GAP_LOG.md`](docs/GAP_LOG.md) (single source of truth)
> **Note:** This file is a summary. All gap details, fix guidance, and resolution history live in GAP_LOG.md.

---

## Build Status

✅ **Preflight sweep passes clean** — 98 checkpoints, 0 blockers
✅ **TypeScript compilation** — 0 errors
✅ **Production build** — passes
✅ **Deploy gate** — committed + pushed to origin/master, verified

---

## 🔴 Critical (1)

| ID | Title | Impact |
|----|-------|--------|
| GAP-CRIT-004 | Admin OTP returned to requester | OTP authentication provides no security boundary; OTP is returned in JSON response |

## 🟠 High (13)

| ID | Title | Impact |
|----|-------|--------|
| GAP-HIGH-010 | Admin JWT fallback secret | Predictable fallback when JWT_SECRET missing |
| GAP-HIGH-011 | Password reset tokens not delivered | Customers can become permanently locked out |
| GAP-HIGH-012 | Security controls/regression coverage incomplete | 80+ API routes with no systematic auth/rate-limit tests |
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

## 🟡 Medium (28)

| ID | Title | Status |
|----|-------|--------|
| GAP-MED-004 | No quotation PDF/print generator | 🟡 Active |
| GAP-MED-005 | Product variants/options not implemented | 🟡 Active |
| GAP-MED-008 | Customer dashboard RFQ history may be incomplete | 🟡 Active |
| GAP-MED-016 | 6 dead `DaVinciOS_*` tables in PostgreSQL schema | 🟡 Active |
| GAP-MED-019 | Stale `@davincios/*` packages in node_modules | 🟡 Active |
| GAP-MED-020 | `tools/payloadcms-ui-3.85.1.tgz` stale artifact | 🟡 Active |
| GAP-MED-022 | `homeu-schema.sql` contains 6 dead DaVinciOS tables | 🟡 Active |
| GAP-MED-023 | Deployer MCP SQL column named `DaVinciOS` | 🟡 Active |
| GAP-MED-024 | Root `package.json` uses `davincios-website` Docker tags | 🟡 Active |
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
| ~~GAP-MED-006~~ | ~~No bulk edit for products~~ | ✅ Resolved |
| ~~GAP-MED-007~~ | ~~No missing-data admin filters~~ | ✅ Resolved |

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

## ✅ Resolved (42)

All 42 resolved gaps are documented in [`docs/GAP_LOG.md`](docs/GAP_LOG.md) with full details under the Resolved section and in the Change Log.

**Notable recent resolutions (2026-06-21/22):**
- **RES-004** (2026-06-21): Analytics/leads/appointments/reports/workflows wiring audit — 20 passing contracts
- **RES-005** (2026-06-21): RFQ chat local migration drift + Facebook inbox webhook schema fix
- **RES-006** (2026-06-21): Unified no-code settings platform — storage table created, runtime wired (AI provider, Telegram, chat widget)
- **RES-007** (2026-06-21): Admin media upload writes to DO Spaces instead of ephemeral container disk
- **GAP-MED-006** (2026-06-22): Bulk edit `PATCH /api/products/bulk` verified live (HTTP 204)
- **GAP-MED-007** (2026-06-22): Missing-data filters `?missing=` verified live (HTTP 200)

---

## Quick Reference

| Metric | Value |
|--------|-------|
| Total gaps | 104 |
| Active | 62 |
| Resolved | 42 |
| Build blockers | 0 |
| Preflight phase count | 8 phases, 98 checks |
| Last full sweep | 2026-06-22 |

---

## Deploy Status

| Commit | Date | Status |
|--------|------|--------|
| `4843be6` — feat: smart collection support on homepage + products category listing | 2026-06-22 | ✅ Live on VPS |
| `b624fdd` — feat: customer tags in create/edit + quick tag toggles | 2026-06-21 | ✅ Live on VPS |
