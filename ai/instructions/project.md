# HomeU Commerce — AI Coding Instructions

## Project
Replace Shopify (www.homeu.ph) with self-hosted site on VPS.
**Stack:** Next.js + DaVinciOS CMS + PostgreSQL + Docker + Hermes3 + Ollama

## Domains
- `homeu.ph` / `www.homeu.ph` = 🔴 LIVE SHOPIFY — Do not touch
- `store.homeu.ph` = 🟢 New frontend (noindex)
- `admin.homeu.ph` = 🟢 DaVinciOS admin

## Available Agents (14 total)

| Agent | Command | What it does |
|-------|---------|--------------|
| `reverse-engineer` | `migrate` | Full pipeline: scan → sync → build → verify |
| `central-brain` | — | PostgreSQL + Hermes3 memory (always query before decisions) |
| `deploy` | `deploy` | VPS Docker deploy (requires approval) |
| `data-sync` | `sync-data` | Shopify → DaVinciOS sync via MCP |
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

## 🧠 Learning Layer Workflow — MANDATORY for ALL Coding Agents

This project enforces a **read-before-write** learning layer. All coding
agents (Kilo Code, Claude Code, Codex, Blackbox, SuperRoo) MUST follow
this workflow:

### BEFORE Coding (Every Substantial Task)

1. **Retrieve relevant lessons first:**
   ```bash
   node tools/lesson-retrieve.mjs query "<brief task description>"
   node tools/lesson-retrieve.mjs files "<primary file paths>"
   node tools/lesson-retrieve.mjs tags "<relevant tags comma-separated>"
   ```
2. **Review top 5-10 lessons** for known pitfalls, patterns, and rules.
3. **Check active tasks** to avoid duplicating work:
   - Kilo Code: use `task_list({ status: "active" })` or `kilo_local_recall`
   - Codex: use Codex Brain MCP `task_list`
   - Claude: use Central Brain MCP `brain_search_memory`

### AFTER Coding (Every Task Completion)

1. **Record a lesson** — every completed task MUST produce a lesson:
   - `node tools/backfill-lessons.mjs --since <TODAY>` (batch backfill)
   - Or use the post-commit hook (automatic for fix/feat/perf commits)
   - Or use MCP tools: `remember` (Kilo), `brain_store_lesson` (Codex/Claude)

2. **Log the task** — append to `memory/task-log.jsonl`:
   ```json
   {"timestamp":"YYYY-MM-DDTHH:MM:SSZ","agent":"<agent-name>","status":"completed","summary":"<what was done>","files":["<files changed>"],"verification":"<how it was verified>"}
   ```

3. **Log bugs** — if a bug was found/fixed, append to `memory/bug-log.jsonl`.

### Lesson Format

```
### Lesson: [Short descriptive title]

Date: YYYY-MM-DD
Source: [Agent name] task completion
Model/API used: [model]
Confidence: [high/medium/low]
Related files: [comma-separated list]

#### Task Summary
[What was accomplished?]

#### Files Changed
- [file1]
- [file2]

#### Bug Cause
[Root cause if applicable, otherwise N/A]

#### Fix Applied
[What fixed it?]

#### Test Result
[pass/fail/unknown]

#### Lesson Learned
[Reusable engineering insight — BE SPECIFIC]

#### Reusable Rule
[Specific actionable rule for future agents]

#### Tags
[tag1, tag2, tag3]
---
```

### Enforcement

- **Post-commit hook** (`.githooks/post-commit`): auto-extracts lessons
  from fix/feat/perf commits.
- **Git config**: `git config core.hooksPath .githooks` (run once per clone)
- **Violation**: Skipping the learning layer is a workflow violation.
  Agents that code without reading/writing lessons will be flagged.

### Tools Reference

| Tool | Purpose | When |
|------|---------|------|
| `tools/lesson-retrieve.mjs` | Search/query lessons BEFORE coding | Every task start |
| `tools/backfill-lessons.mjs` | Batch-extract lessons from git history | After commits / maintenance |
| `memory/lesson-index.jsonl` | Machine-readable lesson index | Programmatic access |
| `memory/lessons-learned.md` | Human-readable lesson archive | Review / reading |
| `memory/task-log.jsonl` | Task completion log | After every task |
| `memory/bug-log.jsonl` | Bug discovery/fix log | When bugs found |

### Quick Reference

```bash
# Before coding — retrieve context
node tools/lesson-retrieve.mjs query "what I'm about to do"

# After coding — backfill any new lessons
node tools/backfill-lessons.mjs

# Check learning layer health
node tools/lesson-retrieve.mjs summary

# View recent lessons
node tools/lesson-retrieve.mjs recent --limit 5
```

---

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
