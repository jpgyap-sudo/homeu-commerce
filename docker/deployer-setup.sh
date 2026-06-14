#!/bin/sh
# Deployer Agent Setup — Run on VPS to install VPS MCP and initialize queue
set -e

cd /opt/homeu-commerce

echo "=== Installing VPS MCP Server ==="
# The deployer agent tools are already on the VPS via git
echo "VPS MCP server: tools/deployer-agent/vps-mcp-server.mjs"

echo "=== Initialize Deployer Queue Schema ==="
docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu << 'SQL'
$(cat tools/deployer-agent/queue-schema.sql)
SQL

echo "=== Start VPS MCP Server via PM2 ==="
pm2 list 2>/dev/null | grep vps-mcp && pm2 restart vps-mcp || \
  pm2 start node --name vps-mcp -- tools/deployer-agent/vps-mcp-server.mjs
pm2 save

echo "=== Test VPS MCP ==="
curl -s http://localhost:3457/ping

echo ""
echo "=== Deployer Setup Complete ==="
echo "VPS MCP:      http://localhost:3457"
echo "Queue DB:     Central Brain PostgreSQL (deployer_* tables)"
echo "Deployer MCP: node tools/deployer-agent/deployer-mcp.mjs"
