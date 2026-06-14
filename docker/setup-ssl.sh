#!/bin/bash
# SSL setup with Let's Encrypt for HomeU Commerce domains
# Run this on the VPS after DNS is pointed to this server

set -e

DOMAINS="-d store.homeu.ph -d admin.homeu.ph"
EMAIL="admin@homeu.ph"

echo "=== Obtaining SSL certificates ==="

docker compose run --rm --entrypoint "\
  certonly --webroot --webroot-path=/var/www/html \
    $DOMAINS \
    --email $EMAIL \
    --agree-tos \
    --non-interactive" certbot

echo ""
echo "=== Certificates obtained ==="
echo "Update nginx.conf to use SSL and reload: docker compose exec nginx nginx -s reload"
