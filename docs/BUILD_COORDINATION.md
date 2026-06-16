# Build Coordination — Multi-Agent Docker Build System

## Purpose

All coding extensions (Kilo Code, Claude Code, Codex, Blackbox, Roo Code) must trigger Docker builds through the **same coordination system** to prevent conflicts, track history, and maintain an audit trail.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Any Coding Extension                               │
│  (Kilo / Claude / Codex / Blackbox / Roo)           │
└──────────┬──────────────────────────────┬───────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│  Build Agent (CLI)  │    │  Deployer Agent (MCP)       │
│  tools/build-agent/ │    │  tools/deployer-agent/      │
│  Local Docker build │    │  Remote VPS build + deploy  │
└──────────┬──────────┘    └──────────────┬──────────────┘
           │                              │
           └──────────┬───────────────────┘
                      ▼
          ┌─────────────────────┐
          │  PostgreSQL Locks   │
          │  deployer_locks     │
          │  deployer_queue     │
          └─────────────────────┘
```

## Two Build Paths

### 1. Local Build (builder stage or full image)

**Use when:** verifying Dockerfile compiles, testing changes locally, before pushing.

```bash
# Fast builder stage (recommended for CI/verification)
node tools/build-agent/build-agent.mjs

# Full production image
node tools/build-agent/build-agent.mjs --full

# Check build status
node tools/build-agent/build-agent.mjs --status
```

### 2. VPS Build (remote, via Deployer Agent MCP)

**Use when:** deploying to production, VPS-specific builds.

```powershell
.\tools\deployer-agent\deploy-helper.ps1 -Action build
# or via deployer-mcp.mjs:
node tools\deployer-agent\deployer-mcp.mjs --deploy
```

## Persistence Guarantee

Every build is persisted across all agents:

| What | Where | Why |
|------|-------|-----|
| Build locks | PostgreSQL `deployer_locks` | Prevents concurrent builds |
| Build queue | PostgreSQL `deployer_queue` | Full history of all builds |
| Task log | `memory/task-log.jsonl` | Human-readable audit trail |
| Bug log | `memory/bug-log.jsonl` | Build failures recorded here |

## Lock Rules

1. **Only one build at a time** across ALL extensions (Kilo + Claude + Codex + Blackbox + Roo)
2. **Lock auto-expires** after 10 minutes (prevents stuck locks)
3. **Queue is shared** — agents can check `--status` to see who's building
4. **Results are logged** — every build records success/failure + duration

## For Agent Developers

When writing agent prompts or task instructions, use this standard language:

```
## Docker Build Verification

After making changes, verify the Docker build compiles:
  node tools/build-agent/build-agent.mjs

This triggers a builder-stage build with PostgreSQL locking
shared across all coding extensions. Results are logged to
memory/task-log.jsonl.
```

## Quick Reference

| Command | What it does |
|---------|-------------|
| `node tools/build-agent/build-agent.mjs` | Build builder stage (local) |
| `node tools/build-agent/build-agent.mjs --full` | Build full image (local) |
| `node tools/build-agent/build-agent.mjs --status` | Show locks, queue, Docker status |
| `node tools/deployer-agent/deployer-mcp.mjs --status` | Show deployer status (incl. VPS) |
| `.\tools\deployer-agent\deploy-helper.ps1 -Action build` | Build on VPS via deployer |
