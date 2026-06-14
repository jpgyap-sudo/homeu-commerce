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

## Blackbox + SuperRoo Memory Split

For this repo, Blackbox should use its native coding workflow and built-in
tools. Do not force Blackbox coding through local Ollama.

SuperRoo remains active as the memory and coordination layer:

- record tasks in `memory/task-log.jsonl`
- record bugs in `memory/bug-log.jsonl`
- store lessons in Codex Brain / SuperRoo lesson memory
- record ML outcomes after meaningful coding/debugging work
- sync lessons and ML artifacts when requested

This split keeps Blackbox's working native tool path while preserving shared
learning for Codex, Kilo Code, Claude, Blackbox, and SuperRoo.
