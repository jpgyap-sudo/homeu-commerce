# AI Coding Instructions

## Project: HomeU Catalog + RFQ Starter

**Goal:** Replace Shopify (www.homeu.ph) with self-hosted on VPS.
**Stack:** Next.js + Payload CMS + PostgreSQL + Docker + Hermes3 + Ollama
**Domains:** Frontend: store.homeu.ph | Admin: admin.homeu.ph

## Phase 1 Strategy
Build as priced furniture catalog with RFQ cart. No checkout/payment in phase 1.

## Key Architecture: Migration Central Brain

The Central Brain is a **PostgreSQL-backed persistent memory** with **Hermes3 reasoning**:

```
tools/migration-brain/
├── brain.mjs              # Orchestrator: init, status, next-steps, store, recall
├── hermes-agent.mjs       # Hermes3 reasoning: URL matching, validation, triage
├── migrations/
│   └── 001-schema.sql     # 12 tables for migration state
└── README.md              # Full architecture docs
```

Use it for every migration decision. Initialize once, then all tools store/read from it.

## Hermes3 (local Ollama, 4.7GB)
- **URL Matcher**: Determines if Shopify URL maps to new URL
- **Product Validator**: Cross-references scanner vs export data
- **Nav Analyst**: Reconstructs hierarchy from flat links
- **Component Mapper**: Maps Liquid sections → Next.js components  
- **Error Triage**: Analyzes errors and suggests fixes
- **SEO Validator**: Scores and improves SEO metadata
- **Strategist**: General migration advice

## Priorities
1. SEO preservation — Use Central Brain URL mappings
2. Visual clone — Use Ollama vision (llava:7b) comparisons
3. Product import — Use Hermes3 cross-referencing
4. RFQ cart — Simple quote-based, no ecommerce
5. Central Brain — Always query before decisions

## Connected Systems
- Codex Brain MCP (global lessons) → Migration Central Brain (project state)
- Ollama hermes3 (reasoning) + llava:7b (vision) → All agents
- PostgreSQL (memory) → Persistent across sessions
