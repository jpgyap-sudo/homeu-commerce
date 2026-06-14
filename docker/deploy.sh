#!/bin/bash
# HomeU Commerce - VPS Deployment Script
# Run this on the VPS after the first git clone

set -e

echo "=== HomeU Commerce Deployment ==="

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> .env created from .env.example — please update secrets!"
fi

# Stop existing containers
docker compose down 2>/dev/null || true

# Build and start
docker compose build --pull
docker compose up -d

# Show status
docker compose ps

echo ""
echo "=== Deployment complete ==="
echo "Frontend: http://store.homeu.ph"
echo "Admin:    http://admin.homeu.ph"
echo ""
echo "Don't forget to:"
echo "  1. Update .env with production secrets"
echo "  2. Run certbot for SSL: docker compose run --rm certbot"
echo "  3. Point DNS records store.homeu.ph and admin.homeu.ph to this server"
