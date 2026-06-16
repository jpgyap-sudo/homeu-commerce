#!/bin/bash
# Rebuild script for HomeU Commerce on VPS
set -e
cd /opt/homeu-commerce
echo "=== BUILDING ==="
docker compose build website 2>&1 | tee /tmp/build.log
echo "=== DONE ==="
