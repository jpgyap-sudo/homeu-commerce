# INSTRUCTION.md — HomeU Shopify → Self-Hosted Migration

## Context

This document is the **single source of truth** for the HomeU migration. It combines the original migration plan with our implemented architecture. The reference source is in `docs/reference/` for historical context.

## Key Domains

```
homeu.ph / www.homeu.ph  = 🔴 LIVE SHOPIFY — Do not touch during migration
store.homeu.ph            = 🟢 New Next.js frontend (preview, noindex)
admin.homeu.ph            = 🟢 Payload CMS admin (backoffice)
```

## Safety Rules (Non-Negotiable)

1. Never change DNS for `homeu.ph` or `www.homeu.ph` during migration
2. Never overwrite the live Shopify theme
3. Never commit `.env`, API keys, tokens, or secrets
4. All code changes go through Git commit + review
5. All Shopify API access is **READ-ONLY** — enforced in `tools/shopify-mcp/server.mjs`
6. Any write operation asks for explicit approval via `tools/shared/approval.mjs`
7. Keep project understandable for a non-senior developer
8. No framework added without a clear role

## Architecture

### Built System

```
┌──────────────────────────────────────────────────────────────────┐
│                    MIGRATION CENTRAL BRAIN                        │
│         (PostgreSQL + Hermes3 reasoning engine)                   │
│  Stores: pages | products | collections | images | URL mappings  │
│          navigation | errors | lessons | visual analysis          │
└─────┬────────────────────────────────────────────────┬───────────┘
      │                                                │
┌─────▼──────────┐                            ┌───────▼──────────┐
│  Shopify MCP    │                            │  Playwright       │
│  (read-only)    │◄──────────────────────────►│  Scanner          │
│  Admin API      │                            │  + llava:7b       │
│  11 tools       │                            └──────────────────┘
└─────────────────┘
      │
┌─────▼──────────┐
│  Payload CMS    │──── PostgreSQL ──── Next.js Frontend
│  Admin Backend  │                       store.homeu.ph
│  5 collections  │
└─────────────────┘
```

### Safety Layer

```
Shopify MCP Server → Code-enforced GET-only → Shopify Admin API
                      └── validateRequestSafety() blocks all writes

Any Write Operation → approval.mjs → Asks "yes" → Proceeds
                      └── 60s timeout → DENIED by default
```

## Phased Migration Plan

### Phase 0 — Stabilize Current Deployment ✅
- [x] VPS Docker deployment running
- [x] SSL certificates installed (Let's Encrypt)
- [x] Payload admin accessible at admin.homeu.ph
- [x] `.env` excluded from git
- [x] Database not publicly exposed

### Phase 1 — Reverse Engineer Shopify ✅
- [x] Playwright scanner: `tools/playwright-scanner/scan.mjs`
- [x] Extracts: URLs, SEO, images, screenshots, HTML, structured data
- [x] Shopify MCP server: `tools/shopify-mcp/server.mjs`
- [x] Central Brain memory: `tools/migration-brain/brain.mjs`
- [x] Output mapping to `tools/shopify-import/output/`

### Phase 2 — SEO & URL Preservation ✅
- [x] URL mapper: `tools/url-mapper/`
- [x] Central Brain `url_mappings` table
- [x] Hermes3 URL matching: `hermes-agent.mjs analyze-url`
- [x] 301 redirect plan generation

### Phase 3 — Product & Collection Sync ✅
- [x] Shopify Admin API via MCP server
- [x] Payload CMS collections ready
- [x] Product-collection relationships
- [x] Sync via Central Brain

### Phase 4 — Image Pipeline ✅
- [x] Image manifest extraction
- [x] Shopify CDN URL preservation
- [x] Alt text preservation
- [x] Image-to-product mapping

### Phase 5 — Temporary Frontend 🔧 In Progress
- [x] Docker container running on VPS
- [x] SSL configured
- [x] Homepage rendering
- [x] `noindex` configured for staging
- [ ] Product listing pages
- [ ] Product detail pages
- [ ] Collection pages
- [ ] Navigation matching Shopify
- [ ] Mobile responsive

### Phase 6 — RFQ Cart 🔧 In Progress
- [x] RFQRequests collection in Payload
- [x] QuoteCart component with localStorage
- [x] Add to RFQ function
- [ ] Cart page UI
- [ ] Email notification
- [ ] Admin workflow

### Phase 7 — AI Agent Layer ✅
- [x] Hermes3 reasoning agent (7 roles)
- [x] Ollama vision (llava:7b)
- [x] Central Brain memory
- [x] Error triage with suggested fixes
- [x] Approval callback system

### Phase 8 — Visual QA ✅
- [x] Playwright screenshots
- [x] Ollama vision comparison
- [x] Hermes3 similarity analysis
- [x] Fix suggestions

### Phase 9 — Soft Launch ⏳
- [ ] Complete URL verification
- [ ] RFQ workflow tested
- [ ] Mobile QA passed
- [ ] Rollback plan documented
- [ ] DNS migration decision

## Coding Style

- Simple, readable code with business logic comments
- TypeScript where configured
- Environment config documented in `.env.example`
- Incremental Git commits
- Each task includes testing steps

## Response Format for Coding Agents

```
Summary:
Files changed:
Why this was done:
Risk level:
How to test:
Rollback method:
Next recommended step:
```

## Immediate Next Steps

1. Complete Phase 5 frontend (product + collection pages)
2. Complete Phase 6 RFQ cart UI
3. Run Shopify MCP export to verify data completeness
4. Cross-reference scanner output with API export via Hermes3
5. Begin Phase 9 launch prep
