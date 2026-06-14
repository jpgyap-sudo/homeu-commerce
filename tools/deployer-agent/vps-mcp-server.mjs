#!/usr/bin/env node

/**
 * VPS MCP Server — Direct connection to the VPS
 * 
 * Runs ON the VPS as a lightweight HTTP server.
 * Falls back when Tailscale/SSH is down.
 * 
 * Install on VPS:
 *   curl -o /opt/homeu-commerce/vps-mcp-server.mjs https://...
 *   node /opt/homeu-commerce/tools/deployer-agent/vps-mcp-server.mjs
 * 
 * Or via SSH:
 *   scp tools/deployer-agent/vps-mcp-server.mjs root@100.64.175.88:/opt/homeu-commerce/
 *   PM2: pm2 start node --name vps-mcp -- /opt/homeu-commerce/vps-mcp-server.mjs
 */

import http from 'http'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const PORT = 3457
const ALLOWED_TOKENS = [process.env.VPS_MCP_TOKEN || 'homeu-vps-mcp-local-only']

function authenticate(req) {
  // Local requests are always allowed
  const addr = req.socket.remoteAddress
  if (addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1') return true
  
  const auth = req.headers['authorization']
  if (!auth) return false
  const token = auth.replace('Bearer ', '')
  return ALLOWED_TOKENS.includes(token)
}

const server = http.createServer(async (req, res) => {
  // CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (!authenticate(req)) {
    res.writeHead(401)
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  try {
    if (req.method === 'GET' && req.url === '/ping') {
      res.writeHead(200)
      res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }))
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      const homepage = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "down"', { encoding: 'utf-8' }).trim()
      const admin = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin 2>/dev/null || echo "down"', { encoding: 'utf-8' }).trim()
      const postgres = execSync('docker exec homeu-commerce-postgres-1 pg_isready -U homeu 2>/dev/null || echo "down"', { encoding: 'utf-8' }).trim()
      
      res.writeHead(200)
      res.end(JSON.stringify({ homepage, admin, postgres, time: new Date().toISOString() }))
      return
    }

    if (req.method === 'POST' && req.url === '/exec') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const { command, timeout = 30000 } = JSON.parse(body)
          const result = execSync(command, {
            encoding: 'utf-8',
            timeout,
            cwd: '/opt/homeu-commerce',
            maxBuffer: 1024 * 1024,
          })
          res.writeHead(200)
          res.end(JSON.stringify({ success: true, output: result.trim() }))
        } catch (err) {
          res.writeHead(500)
          res.end(JSON.stringify({
            success: false,
            error: err.message,
            output: err.stdout?.toString()?.trim() || '',
            stderr: err.stderr?.toString()?.trim() || '',
          }))
        }
      })
      return
    }

    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))

  } catch (err) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VPS MCP Server running on port ${PORT}`)
  console.log(`   Local:   http://localhost:${PORT}/ping`)
  console.log(`   Health:  http://localhost:${PORT}/health`)
  console.log(`   Execute: POST http://localhost:${PORT}/exec`)
})
