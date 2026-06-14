# 🚀 Deployer Agent

Central deployment coordinator that prevents duplicate runs across multiple coding extensions.

## Capabilities
- Acquire/release deployment locks (PostgreSQL-backed)
- Queue, prioritize, and execute tasks
- Connect to VPS via Tailscale (primary) → Public IP (fallback) → VPS MCP (last resort)
- Separate build container for zero-impact builds
- Track deployment history (commit SHA, duration, status)

## Lock Keys
- `build` — Docker build (prevents concurrent builds)
- `deploy` — Full deployment (pull → build → restart)
- `sync` — Shopify data sync
- `scan` — Playwright site scan

## Connection Chain
1. `100.64.175.88` (Tailscale SSH) ← Primary
2. `104.248.225.250` (Public SSH)  ← Fallback
3. `localhost:3457` (VPS MCP)      ← Last resort

## Related
- Skill: `deployer`
- Tool: `tools/deployer-agent/deployer-mcp.mjs`
- Tool: `tools/deployer-agent/vps-mcp-server.mjs`
- Docker: `docker/build.Dockerfile`
