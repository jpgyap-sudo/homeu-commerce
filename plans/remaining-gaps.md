# Remaining Gaps — HomeU Commerce

> **Updated:** 2026-06-20T03:06
> **Status:** All gaps resolved — build is green
> **Resolved:** 70

---

## Build / Preflight Gate Policy — Rebuilding When a Gap Blocks

### Policy (enforced 2026-06-20 Phase 4)

1. **Never force-build or bypass the gate.** If a preflight check or audit fails, fix the blocker and re-run until the sweep passes clean. A passing sweep is the only green light to proceed.

2. **Triage each blocker against the gap log first.** Before investigating from scratch, check `plans/remaining-gaps.md` — the gap may already be known and documented. If it's logged, fix the existing gap entry rather than working around it.

3. **A blocker in pre-existing/unrelated code still blocks the build.** Even if the issue is in legacy code you didn't write, it must be resolved or explicitly deferred by the system owner before the build proceeds.

4. **Tooling false positives → fix the sweep, don't suppress the rule.** If a Playwright test, ESLint rule, or preflight check fires incorrectly, fix the test (update regex, adjust assertion) rather than deleting or disabling the check. Notes the 2026-06-20 Phase 4 rewrite where Turbopack-incompatible CSS regex in the E2E auditor was corrected rather than removed.

5. **All known build-blockers resolved.** The last critical gap (`GAP-CRIT-003` — RFQ route/schema) was fixed on 2026-06-20. Build is green.

---

## Active Gaps

✅ **None** — all 70 gaps resolved.

---

## Resolved Gaps

### 🔴 CRIT-003 — `/api/rfq-requests` Missing + RFQ Schema Inconsistent ✅

**Severity:** 🔴 Critical — was blocking customer RFQ pages, admin RFQ workflows, and the `POST /api/rfq` endpoint.

**Fixed: 2026-06-20**

| What | File | Change |
|------|------|--------|
| New route created | `apps/website/src/app/api/rfq-requests/route.ts` | `GET /api/rfq-requests?customerId=N` — list with items JSON aggregated, camelCase keys |
| New route created | `apps/website/src/app/api/rfq-requests/[id]/route.ts` | `GET /api/rfq-requests/[id]` — single detail with camelCase keys matching RFQDetail |
| Fixed POST handler | `apps/website/src/app/api/rfq/route.ts` | Now accepts `deliveryLocation`, `projectType`, `notes`, `customer` from QuoteCart payload |
| Fixed items INSERT | `apps/website/src/app/api/rfq/route.ts` | Uses `product_id`, `product_title_snapshot`, `sku_snapshot`, `unit_price_snapshot`, `notes` |
| Fixed customer RFQs | `apps/website/src/app/api/customers/[id]/rfqs/route.ts` | Uses `customer_id`, returns camelCase with aggregated items |
| Fixed dashboard | `apps/website/src/app/customer/dashboard/page.tsx` | Uses `?customerId=N` format instead of PayloadCMS `where` syntax |
| Fixed admin picker | `apps/website/src/app/admin/quotations/new/page.tsx` | Uses `?search=` format and reads `data.rfqs` instead of `data.docs` |
| Migration | `tools/migrate/migrations/003_add_rfq_columns.sql` | Created `rfq_request_items` table, added `customer_id`/`address`/`message`/quotation/closure columns to `rfq_requests` |
| Database | N/A | Applied migration: `rfq_request_items` created, all columns exist |

### Final Sweep — Light Blue Sidebar + Remaining Gaps (2026-06-18)
| Gap | Action | Status |
|-----|--------|--------|
| Sidebar | Dark navy → light blue (#eff6ff), blue active states, better contrast | ✅ Fixed |
| Login panel | Dark navy → blue gradient, white text | ✅ Fixed |
| ViberHandoff | Copy-to-clipboard button added | ✅ Fixed |
| E2E test | All 18/18 tests pass (Turbopack-compatible patterns) | ✅ Fixed |
| All remaining 5 | Verified or fixed | ✅ Done |

### Final Session — Sweep 5 (2026-06-18)
| Gap | Action | Status |
|-----|--------|--------|
| E2E test | Regex updated for Turbopack CSS paths | ✅ Fixed |
| LOW-007 | Admin search/status: correct HTML-native behavior | ✅ Verified |
| LOW-008 | ChatWidget dual paths: intentional auth separation | ✅ Verified |
| LOW-006 | Login inline styles: already CSS classes | ✅ Verified |
| MED-008 | All 10 customer pages exist, pending E2E test | ✅ Verified |

### Today's Fixes — Sweep 4 (2026-06-18)
| Gap | Action | Status |
|-----|--------|--------|
| LOW-014 | Delete button added to quotation edit page | ✅ Fixed |
| LOW-015 | Back-link already correct (admin→/admin/quotations) | ✅ Verified |
| LOW-006 | Login form already uses CSS classes (no inline styles) | ✅ Verified |
| MED-004 | PDF Download button added to quotation header | ✅ Fixed |
| MED-006 | Bulk Edit Products API: `PATCH /api/products/bulk` | ✅ Fixed |
| LOW-003 | Chatbot schema applied to PostgreSQL | ✅ Fixed |

### Today's Fixes — Sweep 1 (2026-06-18)
| Gap | Action | Status |
|-----|--------|--------|
| MED-005 | Product Variants removed from scope | ✅ Removed |
| MED-016 | Dropped 6 dead `payload_*` tables | ✅ Fixed |
| MED-019 | Deleted stale `@davincios/*` packages | ✅ Fixed |
| MED-020 | `payloadcms-ui.tgz` deleted by preflight | ✅ Fixed |
| MED-022 | `homeu-schema.sql` verified clean | ✅ Verified |
| MED-024 | Docker tags: `davincios-website` → `homeu-website` | ✅ Fixed |
| MED-031 | Deleted `tools/rebrand/` scripts | ✅ Fixed |

### Today's Fixes — Sweep 3 (2026-06-18)
| Gap | Action | Status |
|-----|--------|--------|
| MED-007 | Missing data filters: `?missing=image,seo,price,category,description,dimensions` | ✅ Fixed |
| LOW-001 | Bank placeholder → env-based default | ✅ Fixed |
| LOW-011 | Bank placeholder in new form → env-based | ✅ Fixed |
| LOW-002 | Viber dummy number removed | ✅ Fixed (prev) |
| LOW-004 | component-map.md created | ✅ Fixed |
| LOW-009 | msgCounter → useRef (StrictMode fix) | ✅ Fixed |
| LOW-010 | handleAutoLead silent catch → console.error | ✅ Fixed |
| LOW-013 | Viber number clickable (viber:// protocol) | ✅ Fixed |

### Resolved (2026-06-18)
| Gap | Action | Status |
|-----|--------|--------|
| MED-023 | Deployer MCP: `DaVinciOS` → `metadata` (param + column) | ✅ Fixed |
| MED-025 | GitHub Actions: workflow name, URLs, rollback command | ✅ Fixed |
| MED-034 | build-and-deploy verified clean | ✅ Verified |
| MED-004 | Quotation PDF Generator (jspdf, branded A4 template) | ✅ Fixed |
| LOW-002 | Viber placeholder `+639171234567` removed (2 files) | ✅ Fixed |
| LOW-005 | Bare catch blocks already clean | ✅ Verified |

### All 69 Gaps Resolved Before GAP-CRIT-003

```
Started:  54 active → 0 critical / 4 high / 32 medium / 18 low
Now:       1 active → 1 critical (BUILD BLOCKER)
Resolved: 69 gaps total
```
