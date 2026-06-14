# HomeU Migration — Feature Status Matrix

Maps every feature from the reference (`FEATURES.md`) to our implementation status.

| ID | Feature | Priority | Status | Where |
|----|---------|----------|--------|-------|
| **P0 — Migration Safety** |
| 1 | Domain Separation | P0 | ✅ Done | DNS: homeu.ph=Shopify, store.homeu.ph=Frontend, admin.homeu.ph=Admin |
| 2 | Secrets Protection | P0 | ✅ Done | `.env` in gitignore, `.env.example` with warnings, Payload DB internal |
| 3 | Backup & Rollback | P0 | ⚠️ Partial | Git tags pending, VPS deployment works, rollback plan in `docs/migration-plan.md` |
| **P0 — Reverse Engineering** |
| 4 | Playwright Site Crawler | P0 | ✅ Done | `tools/playwright-scanner/scan.mjs` — full crawl, SEO, images, screenshots, HTML |
| 5 | Website Structure Extractor | P0 | ✅ Done | Playwright scanner extracts all page types, nav structure, forms, tracking scripts |
| 6 | SEO URL Map | P0 | ✅ Done | `tools/url-mapper/`, Central Brain stores URL mappings, 301 redirect map generation |
| **P1 — Shopify Catalog Sync** |
| 7 | Product Sync | P1 | ✅ Done | `tools/shopify-mcp/server.mjs` — 11 read-only MCP tools, Admin API, full export |
| 8 | Collection Sync | P1 | ✅ Done | Collections with product mappings in MCP export + Central Brain |
| 9 | Sync Logs | P1 | ✅ Done | Central Brain logs all sync operations, errors with Hermes3 triage |
| **P1 — Payload Backend/Admin** |
| 10 | Product Mirror Collection | P1 | ✅ Done | Payload `Products` collection with shopifyId, all fields mapped |
| 11 | Collection Mirror Collection | P1 | ✅ Done | Payload `Categories` collection with shopifyId |
| 12 | Page Mirror Collection | P1 | ✅ Done | Payload `Pages` collection with shopifyId + shopifyOriginalUrl |
| **P1 — Temporary Frontend** |
| 13 | Store Preview Frontend | P1 | ✅ Done | Next.js on `store.homeu.ph`, Docker, SSL |
| 14 | Product Listing | P1 | 🔧 Building | Collection pages + product grid components |
| 15 | Product Detail Page | P1 | 🔧 Building | Product detail with images, description, RFQ button |
| **P1 — RFQ Cart** |
| 16 | Add to RFQ | P1 | ✅ Done | `QuoteCart.tsx` — localStorage cart with add, quantity, notes |
| 17 | RFQ Cart Page | P1 | 🔧 Building | Cart view UI pending |
| 18 | RFQ Submission Form | P1 | ✅ Done | Payload `RFQRequests` collection — full form fields |
| 19 | RFQ Admin View | P1 | ✅ Done | Payload admin panel at `admin.homeu.ph/admin` for RFQ management |
| 20 | RFQ Notification | P1 | ⏳ Pending | Email notification upon submission |
| **P2 — AI Agent Assistant** |
| 21 | Website Auditor Agent | P2 | ✅ Done | Central Brain + Hermes3: reads crawler output, screenshots, SEO map, sync logs |
| 22 | SEO Agent | P2 | ✅ Done | `hermes-agent.mjs validate-seo` — validates titles, descriptions, canonicals |
| 23 | Content Agent | P2 | ✅ Done | `hermes-agent.mjs` — can draft product descriptions, content |
| 24 | Frontend Builder Agent | P2 | ✅ Done | Reverse engineer skill generates component mappings |
| 25 | QA Agent | P2 | ✅ Done | Playwright screenshot comparison, Ollama vision (llava:7b) analysis |
| **P2 — Visual Comparison** |
| 26 | Screenshot Comparison | P2 | ✅ Done | Playwright scanner takes full-page screenshots, `ollama-vision.mjs verify` |
| 27 | Vision AI Review | P2 | ✅ Done | llava:7b analyzes screenshots, compares old vs new |
| **P2 — Admin Workflow** |
| 28 | Migration Dashboard | P2 | ⏳ Pending | Central Brain `report` command provides CLI dashboard |
| 29 | Quotation Dashboard | P2 | ⏳ Pending | Payload admin already has RFQ collection admin |
| **P3 — Future** |
| 30 | Competitor Comparison | P3 | ⏳ Not started |
| 31 | Blog/SEO System | P3 | ⏳ Not started |
| 32 | A/B Test Suggestions | P3 | ⏳ Not started |
| 33 | Shopify Theme Patcher | P3 | ⏳ Not started |
| 34 | Analytics Summary | P3 | ⏳ Not started |

## Legend

| Icon | Meaning |
|------|---------|
| ✅ Done | Fully implemented and deployed |
| 🔧 Building | Core exists, UI/completion pending |
| ⚠️ Partial | Works but needs improvement |
| ⏳ Pending | Planned but not started |
| ❌ Blocked | Needs external dependency |

## What We Built vs What Was Reference

| Reference Concept | Our Implementation | Innovation |
|------------------|-------------------|------------|
| Basic Playwright crawler | `scan.mjs` + HTML parsing + Shopify CDN image extraction | Handles Shopify JS-heavy pages |
| Shopify API tool | `shopify-mcp/server.mjs` — MCP protocol server | Can be called directly by AI agents |
| AI agent prompts | `hermes-agent.mjs` — 7 reasoning roles | Live reasoning, not static prompts |
| Basic file output | PostgreSQL Central Brain (12 tables) | Queryable, resumable, relational |
| Manual QA | Ollama vision `llava:7b` integration | Automated visual comparison |
| Simple migration data | Hermes3 error triage + suggested fixes | Intelligent error analysis |
