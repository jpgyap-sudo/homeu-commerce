# Migration Decisions Log

Key architectural decisions made during the HomeU Shopify → self-hosted migration.

## Architecture Decisions

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | **Payload CMS over Medusa** | Phase 1 doesn't need checkout/orders. Payload is simpler, no ecommerce overhead. Add Medusa later if needed. | 2026-06-14 |
| 2 | **PostgreSQL Central Brain** | Flat JSON doesn't scale for 661 products + 30 collections + 2000 images. PostgreSQL gives queries, joins, resumability. | 2026-06-14 |
| 3 | **Hermes3 over external AI** | Local hermes3:latest (4.7GB) avoids API costs, works offline, keeps data private. | 2026-06-14 |
| 4 | **Shopify MCP server (read-only)** | MCP protocol allows AI agents to call Shopify API directly. Enforced GET-only at code level. | 2026-06-14 |
| 5 | **Shopify as source of truth** | Don't fully replace Shopify during migration. Keep live site untouched. New system mirrors data. | 2026-06-14 |
| 6 | **Approval callback for all writes** | Every write operation pauses and asks for explicit user "yes". Default deny after 60s timeout. | 2026-06-14 |
| 7 | **HTML parsing over page.evaluate** | Shopify's Turbolinks/JS destroys execution context. HTML content() parsing is more reliable. | 2026-06-14 |
| 8 | **LLava:7b for visual analysis** | Local vision model for screenshot comparison. No API calls, no data leaves the machine. | 2026-06-14 |
| 9 | **Host nginx over Docker nginx** | VPS already has nginx on port 80/443. Configured host nginx as reverse proxy to avoid port conflicts. | 2026-06-14 |
| 10 | **Standalone Next.js output** | Docker multi-stage build with `output: 'standalone'` minimizes image size and attack surface. | 2026-06-14 |

## Superseded Decisions

| # | Old Decision | Replaced By | Why |
|---|-------------|-------------|-----|
| 1 | Flat JSON output | PostgreSQL Central Brain | Needed queries, relations, resumability |
| 2 | Docker nginx container | Host nginx reverse proxy | Port conflict with existing services |

## Safety Rules Enforced

- [x] Shopify API access = READ ONLY (code-enforced GET-only)
- [x] All writes require explicit user approval
- [x] No secrets in git (`.env` gitignored)
- [x] Database not publicly exposed
- [x] API tokens stored locally only
- [x] VPS ports restricted (80/443 only public)
