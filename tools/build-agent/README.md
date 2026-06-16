# Build Agent — Docker Build Coordinator

**For ALL coding extensions:** Kilo Code, Claude Code, Codex, Blackbox, Roo Code, Cline, etc.

## What It Does

Provides a **single, standardized command** that any agent can call to trigger a Docker build. It:

1. **Checks PostgreSQL locks** — prevents concurrent builds across all extensions
2. **Acquires build lock** — shared with the Deployer Agent (`deployer_locks` table)
3. **Queues the build** — tracked in `deployer_queue` for full audit trail
4. **Runs `docker build`** — locally, not via VPS SSH
5. **Logs results** — to `memory/task-log.jsonl` via central-logger
6. **Releases lock** — so other agents can build

## Usage

```bash
# Build builder stage only (faster — recommended for CI/verification)
node tools/build-agent/build-agent.mjs

# Build full production image (slower — for deployment)
node tools/build-agent/build-agent.mjs --full

# Check build system status
node tools/build-agent/build-agent.mjs --status
```

## Output

The script outputs structured JSON to stdout:

```json
{
  "success": true,
  "target": "builder",
  "imageTag": "homeu-website:builder",
  "duration": 127,
  "agent": "build-agent-a1b2c3d4",
  "timestamp": "2026-06-16T01:30:00.000Z",
  "summary": "✅ Builder Stage build completed in 127s"
}
```

## Integration with Agent Workflows

### From any agent prompt:

```
To trigger a Docker build, run:
  node tools/build-agent/build-agent.mjs
```

### From Agent Manager / task tool:

```
Run the build agent to verify the Dockerfile compiles:
  node tools/build-agent/build-agent.mjs
```

### In CI/CD:

```bash
node tools/build-agent/build-agent.mjs --full && \
node tools/deployer-agent/deployer-mcp.mjs --deploy
```

## Lock Coordination

The build agent shares PostgreSQL locks with the Deployer Agent:

- **Lock key:** `build`
- **Table:** `deployer_locks` (same as deployer-agent)
- **Expiry:** 10 minutes (auto-released if agent crashes)
- **Queue:** `deployer_queue` — full history of all builds

If another extension holds the build lock, the build agent exits with status 1 and a clear message. Use `--status` to check who holds the lock.

## Fault Tolerance

- If PostgreSQL is unavailable, the build **still runs** (without lock coordination)
- If Docker is unavailable, the build **fails immediately** with a clear message
- Locks auto-expire after 10 minutes (prevents stuck locks)
- All failures are logged to `memory/task-log.jsonl`
