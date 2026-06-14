# HomeU Commerce — AI Coding Instructions

## Project
Replace Shopify (www.homeu.ph) with self-hosted site on VPS.
**Stack:** Next.js + Payload CMS + PostgreSQL + Docker + Hermes3 + Ollama

## Domains
- `homeu.ph` / `www.homeu.ph` = 🔴 LIVE SHOPIFY — Do not touch
- `store.homeu.ph` = 🟢 New frontend (noindex)
- `admin.homeu.ph` = 🟢 Payload admin

## Available Agents (14 total)

| Agent | Command | What it does |
|-------|---------|--------------|
| `reverse-engineer` | `migrate` | Full pipeline: scan → sync → build → verify |
| `central-brain` | — | PostgreSQL + Hermes3 memory (always query before decisions) |
| `deploy` | `deploy` | VPS Docker deploy (requires approval) |
| `data-sync` | `sync-data` | Shopify → Payload sync via MCP |
| `image-pipeline` | — | Image download/optimize/storage |
| `navigation` | — | Shopify menu → Next.js components |
| `theme-migration` | — | Liquid → Next.js component mapping |
| `security` | `security-scan` | Security audit |
| `planner` | `plan` | Prioritize next tasks |
| `shopify-auditor` | — | Cross-reference data sources |
| `seo` | — | SEO metadata validation |
| `frontend-builder` | — | Build Next.js components |
| `qa` | — | QA checks |
| `content` | — | Content drafting |

## Safety Rules
1. Never change DNS for homeu.ph/www.homeu.ph
2. Shopify = READ ONLY (enforced in MCP server code)
3. All writes require approval via `tools/shared/approval.mjs`
4. No secrets committed (.env gitignored)
5. Full agent list: `agents/README.md`
6. Feature status: `docs/STATUS.md`
7. Migration plan: `docs/INSTRUCTION.md`
