# Migration Central Brain Agent

## Description
PostgreSQL-backed persistent memory with Hermes3 reasoning for the Shopify → DaVinciOS CMS migration.

## Capabilities
- Initialize and manage PostgreSQL schema for migration data
- Store and query pages, products, collections, images
- Track URL mappings for 301 redirects
- Log migration errors with Hermes3 triage
- Remember cross-session lessons and patterns
- Generate comprehensive migration status reports
- Suggest next steps via Hermes3 reasoning

## Tools
- `tools/migration-brain/brain.mjs` — Central Brain orchestrator
- `tools/migration-brain/hermes-agent.mjs` — Hermes3 reasoning
- `tools/migration-brain/migrations/001-schema.sql` — Database schema

## Database
PostgreSQL (same instance as DaVinciOS CMS) with 12 tables for migration state.

## Related
- Skill: migration-central-brain
- Skill: shopify-reverse-engineer
- Agent: reverse-engineer
