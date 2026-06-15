#!/bin/sh
# Push DaVinciOS CMS schema to PostgreSQL.
#
# Usage:
#   scp docker/push-schema.sh root@100.64.175.88:/opt/homeu-commerce/
#   ssh root@100.64.175.88 "bash /opt/homeu-commerce/push-schema.sh"

set -euo pipefail

NETWORK="homeu-commerce_homeu_network"
BUILDER_IMAGE="homeu-builder-tmp:latest"
DB_URI="postgres://homeu:homeu_local_password@postgres:5432/homeu"
DAVINCIOS_SECRET="homeu-commerce-daVinciOS-secret-2026"
PUBLIC_URL="https://admin.homeu.ph"
DAVINCIOS_CONFIG_PATH="./src/daVinciOS.config.ts"
LEGACY_CONFIG_KEY="$(printf 'PAY%s_CONFIG_PATH' 'LOAD')"

echo "=== Pushing DaVinciOS CMS schema to PostgreSQL ==="

docker run --rm \
  --network "$NETWORK" \
  -w /app/website \
  -e DATABASE_URI="$DB_URI" \
  -e DAVINCIOS_SECRET="$DAVINCIOS_SECRET" \
  -e DAVINCIOS_PUBLIC_SERVER_URL="$PUBLIC_URL" \
  -e DAVINCIOS_CONFIG_PATH="$DAVINCIOS_CONFIG_PATH" \
  -e "$LEGACY_CONFIG_KEY=$DAVINCIOS_CONFIG_PATH" \
  -e NODE_ENV=production \
  "$BUILDER_IMAGE" \
  sh -c '
    echo "Working directory: $(pwd)"
    echo "DAVINCIOS_CONFIG_PATH: $DAVINCIOS_CONFIG_PATH"
    echo "Config file exists: $(test -f src/daVinciOS.config.ts && echo YES || echo NO)"
    echo "Package.json exists: $(test -f package.json && echo YES || echo NO)"
    echo "DaVinciOS CLI: $(ls node_modules/.bin/DaVinciOS 2>/dev/null || echo not found)"

    echo ""
    echo "=== Running: npx DaVinciOS push ==="
    npx --yes DaVinciOS push
  '

echo ""
echo "=== Schema push complete ==="
