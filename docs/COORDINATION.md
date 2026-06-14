# 🤝 Multi-Extension Coordination Protocol

## The Problem
Multiple coding extensions (Kilo Code, VS Code agents, Claude Code, etc.) running at the same time can:
- Build the Docker image simultaneously (waste, conflicts)
- Deploy while another deploy is in progress (inconsistent state)
- Scan the site concurrently (rate limiting, data races)
- Step on each other's changes (git conflicts)

## The Solution: Deployer Agent

ALL operations that touch the VPS go through the **Deployer Agent**. It runs as a **persistent MCP server** that all coding extensions connect to.

### Architecture

```
Extension A (Kilo Code)  ──┐
                            ├──→ Deployer Agent MCP ──→ PostgreSQL Locks
Extension B (Claude Code) ──┘         │
                                       └──→ Queue ──→ VPS (tailscale/ssh/mcp)
Extension C (VS Code Agent) ──┐
                              └──→ .\deploy-helper.ps1 ──→ Deployer Agent (gateway)
```

### MCP Server (for AI Agents)

The Deployer Agent registers itself as an MCP server in `.vscode/mcp.json`. Every coding extension that supports MCP can call its tools:

| Tool | What it does | Lock |
|------|-------------|------|
| `deployer_deploy` | git pull → build → restart → health check | `deploy` |
| `deployer_build` | Docker build only | `build` |
| `deployer_sync` | Shopify data sync | `sync` |
| `deployer_scan` | Playwright scan | `scan` |
| `deployer_status` | Show locks, queue, history | None |

### PowerShell Gateway (for manual/CI use)

```powershell
# ALWAYS use this instead of direct docker compose:
.\tools\deployer-agent\deploy-helper.ps1 -Action deploy
.\tools\deployer-agent\deploy-helper.ps1 -Action status
.\tools\deployer-agent\deploy-helper.ps1 -Action build
.\tools\deployer-agent\deploy-helper.ps1 -Action health
```

### Locking Rules

1. **Acquire lock before starting** — If locked, queue the task
2. **Lock auto-expires** after 5 minutes (prevents stuck locks)
3. **Queue processes** in priority order — highest priority first
4. **History logged** — every deployment recorded in `deployer_history`

### What Happens if You Bypass

If you run `docker compose build` directly (not through the Deployer Agent):

```
⛔ CONFLICT: Another extension might be building simultaneously
⛔ No lock check — duplicate builds waste resources
⛔ No queue — one build overwrites another
⛔ No history — can't track who deployed what
```

### Auto-Start

The Deployer Agent starts automatically when:
- VS Code launches (via `.vscode/mcp.json` MCP server config)
- Manually: `.\tools\deployer-agent\start-deployer.bat`

On the VPS, the VPS MCP server runs via PM2:
```bash
pm2 start node --name vps-mcp -- tools/deployer-agent/vps-mcp-server.mjs
pm2 save
```

### Connection Priority

1. **VPS MCP** (`localhost:3457`) — Fastest, direct HTTP API
2. **Tailscale SSH** (`100.64.175.88`) — Primary SSH
3. **Public SSH** (`104.248.225.250`) — Fallback

### Identifying Your Extension

Set `DEPLOYER_EXTENSION_ID` to identify which extension is making requests:
- VS Code: `vscode-{workspaceName}`
- Claude Code: `claude-code-{user}`
- Kilo Code: `kilo-{session}`
- CI: `ci-github-actions`
