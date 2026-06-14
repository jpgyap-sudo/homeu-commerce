#!/bin/sh
# ═══════════════════════════════════════════════════════════════
#  push-schema.sh — Push Payload CMS schema to PostgreSQL
# ═══════════════════════════════════════════════════════════════
#  Runs inside the builder container (homeu-builder-tmp:latest)
#  which has full node_modules under /app/website/
#
#  Usage:
#    scp docker/push-schema.sh root@100.64.175.88:/opt/homeu-commerce/
#    ssh root@100.64.175.88 "bash /opt/homeu-commerce/push-schema.sh"
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
NETWORK="homeu-commerce_homeu_network"
BUILDER_IMAGE="homeu-builder-tmp:latest"
DB_URI="postgres://homeu:homeu_local_password@postgres:5432/homeu"
PAYLOAD_SECRET="homeu-commerce-payload-secret-2026"
PUBLIC_URL="https://admin.homeu.ph"

echo "=== Pushing Payload CMS schema to PostgreSQL ==="

# Run the builder container with:
#   -w /app/website       → working directory where package.json & tsconfig live
#   PAYLOAD_CONFIG_PATH   → relative to /app/website → ./src/payload.config.ts
#   --network             → access the postgres container
#   --rm                  → auto-remove after completion
docker run --rm \
  --network "$NETWORK" \
  -w /app/website \
  -e DATABASE_URI="$DB_URI" \
  -e PAYLOAD_SECRET="$PAYLOAD_SECRET" \
  -e PAYLOAD_PUBLIC_SERVER_URL="$PUBLIC_URL" \
  -e PAYLOAD_CONFIG_PATH="./src/payload.config.ts" \
  -e NODE_ENV=production \
  "$BUILDER_IMAGE" \
  sh -c '
    echo "Working directory: $(pwd)"
    echo "PAYLOAD_CONFIG_PATH: $PAYLOAD_CONFIG_PATH"
    echo "Config file exists: $(test -f src/payload.config.ts && echo YES || echo NO)"
    echo "Package.json exists: $(test -f package.json && echo YES || echo NO)"
    echo "Payload CLI: $(ls node_modules/.bin/payload 2>/dev/null || echo not found)"

    echo ""
    echo "=== Running: npx payload push ==="
    npx --yes payload push
  '

echo ""
echo "=== Schema push complete ==="
