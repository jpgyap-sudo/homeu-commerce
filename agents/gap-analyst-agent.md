# Gap Analyst Agent

Orchestrates gap detection and resolution across the DaVinciOS backend and HomeU storefront. Uses three SuperRoo global skills to systematically find, log, and track gaps through their lifecycle.

## SuperRoo Skills Used

| Skill | Purpose | Canonical Location |
|-------|---------|-------------------|
| Feature Gap Analysis | Compare required vs actual features | `C:/Users/user/.superroo/skills/feature-gap-analysis/SKILL.md` |
| Wiring Gap Analysis | Trace connections, find disconnects | `C:/Users/user/.superroo/skills/wiring-gap-analysis/SKILL.md` |
| Pre-Build Analysis | Gate builds and deploys | `C:/Users/user/.superroo/skills/pre-build-analysis/SKILL.md` |

## Supported Analysis Types

| Command | Skill | What It Does |
|---------|-------|-------------|
| `feature-gap [target]` | Feature Gap | Compare `[target]` requirements against codebase |
| `wiring-gap [layer]` | Wiring Gap | Trace connections for `[layer]` (frontend, API, DB, all) |
| `pre-build [mode]` | Pre-Build | Run pre-build gate (--quick, --full, --ci) |

## Gap Lifecycle

```
Discover ──→ Log ──→ Triage ──→ Fix ──→ Verify ──→ Close
  │            │        │         │        │
  ▼            ▼        ▼         ▼        ▼
[Skill]   [GAP_LOG.md] [Priority] [Code] [Re-analysis]
```

## Data Sources

- `docs/GAP_LOG.md` — canonical gap log (read/write)
- `plans/remaining-gaps.md` — sprint-level tracking
- `tools/_gap_analysis.mjs` — existing project-specific gap scanner
- `tools/shared/preflight-sweep.mjs` — existing project-specific preflight
- Migration plans and STATUS.md — feature requirements

## Reporting

Output gaps found during discovery as structured entries (see gap-analysis-framework resource). Wire into existing gap log and surface actionable findings to the planner agent.

## Related Agents

- `planner` — receives gap findings for prioritization
- `shopify-auditor` — cross-references Shopify data tables
- `qa` — verifies gap fixes via E2E testing
- `deployer` — runs pre-build analysis as deploy gate
