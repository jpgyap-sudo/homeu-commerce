#!/usr/bin/env pwsh
<#
.SYNOPSIS
    HomeU Deployment Gateway — ALL deploys MUST go through this script.
    This is the ONLY way to run docker compose on the VPS.
    Bypassing this script will cause coordination conflicts.

.DESCRIPTION
    - Checks with Deployer Agent MCP for existing locks
    - Queues the deployment if another extension is already building
    - Runs the actual docker compose commands
    - Reports status back to Central Brain

.PARAMETER Action
    What to do: build, deploy, sync, scan, status, queue

.PARAMETER AutoApprove
    Skip approval prompt (for CI/automated runs)

.EXAMPLE
    .\deploy-helper.ps1 status
    .\deploy-helper.ps1 build
    .\deploy-helper.ps1 deploy
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('build', 'deploy', 'sync', 'scan', 'status', 'queue', 'health', 'pending', 'deploy-pending')]
    [string]$Action = 'status',

    [Parameter(Mandatory = $false)]
    [switch]$AutoApprove
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Write-Banner {
    param([string]$Message, [string]$Color = 'Yellow')
    $line = '=' * 60
    Write-Host "`n$line" -ForegroundColor $Color
    Write-Host "  🚀 $Message" -ForegroundColor $Color
    Write-Host "$line`n" -ForegroundColor $Color
}

function Invoke-ApprovalGate {
    param([string]$Action)
    if ($AutoApprove) { return $true }

    Write-Host "`n🔐 APPROVAL REQUIRED" -ForegroundColor Red
    Write-Host "  Action: $Action on VPS (100.64.175.88)" -ForegroundColor Yellow
    Write-Host "  Timeout: 60 seconds" -ForegroundColor Yellow
    $response = Read-Host "`n  Type 'yes' to proceed"
    
    if ($response -ne 'yes') {
        Write-Host "❌ Operation denied by user" -ForegroundColor Red
        return $false
    }
    return $true
}

function Get-DeployerStatus {
    try {
        $deployerScript = Join-Path $ProjectRoot "tools\deployer-agent\deployer-mcp.mjs"
        $result = node $deployerScript --status 2>&1
        return $result
    }
    catch {
        return "Deployer MCP not running: $_"
    }
}

function Test-Lock {
    param([string]$LockKey)
    # Quick check if deployer MCP is running
    try {
        $lockTable = & "$ProjectRoot\tools\deployer-agent\deployer-mcp.mjs" --status 2>&1 | Out-String
        if ($lockTable -match "$LockKey.*locked") {
            return $true
        }
    }
    catch {}
    return $false
}

function Invoke-VPSCommand {
    param([string]$Command)
    
    $SSH_KEY = "C:\Users\User\.ssh\id_superroo_vps"
    $targets = @(
        @{ Host = '100.64.175.88'; Via = 'Tailscale' },
        @{ Host = '104.248.225.250'; Via = 'Public IP' }
    )
    
    # Try VPS MCP first (fastest)
    try {
        $body = @{ command = $Command; timeout = 300000 } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:3457/exec" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 310
        if ($response.success) {
            return @{ Success = $true; Output = $response.output; Via = 'VPS-MCP' }
        }
    }
    catch { Write-Warning "VPS MCP unavailable, trying SSH..." }

    # Try SSH via Tailscale first, then public IP
    foreach ($target in $targets) {
        try {
            $result = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -i "$SSH_KEY" "root@$($target.Host)" $Command 2>&1
            if ($LASTEXITCODE -eq 0) {
                return @{ Success = $true; Output = $result; Via = "SSH-$($target.Via)" }
            }
            Write-Warning "SSH to $($target.Via) failed"
        }
        catch { Write-Warning "SSH to $($target.Via): $_" }
    }
    
    return @{ Success = $false; Output = 'All connection methods failed' }
}

# ============================
# MAIN
# ============================

Write-Banner "HomeU Deployment Gateway" "Cyan"
Write-Host "  Extension ID: vscode-$([System.Environment]::MachineName)"
Write-Host "  Project: $ProjectRoot`n"

switch ($Action) {
    'status' {
        Write-Host "Current deployer status:" -ForegroundColor Green
        $status = Get-DeployerStatus
        Write-Host $status
    }

    'queue' {
        Write-Host "Active queue:" -ForegroundColor Green
        & $ProjectRoot\tools\deployer-agent\deployer-mcp.mjs --queue 2>&1
    }

    'health' {
        Write-Host "Health check:" -ForegroundColor Green
        $result = Invoke-VPSCommand "curl -s -o /dev/null -w 'Homepage: %{http_code} | Admin: %{http_code}' http://localhost:3000/ http://localhost:3000/admin"
        if ($result.Success) {
            Write-Host "  $($result.Output) (via $($result.Via))" -ForegroundColor Green
        } else {
            Write-Host "  ❌ VPS unreachable: $($result.Output)" -ForegroundColor Red
        }
        Write-Host "`nQueue (via deployer):"
        & $ProjectRoot\tools\deployer-agent\deployer-mcp.mjs --queue 2>&1
    }

    'build' {
        if (-not (Invoke-ApprovalGate -Action "Docker Build")) { exit 1 }
        
        if (Test-Lock -LockKey 'build') {
            Write-Host "⚠️  Build lock held by another extension. Queuing..." -ForegroundColor Yellow
            & $ProjectRoot\tools\deployer-agent\deployer-mcp.mjs --queue 2>&1
            exit 1
        }
        
        Write-Banner "Starting Build" "Green"
        $result = Invoke-VPSCommand "cd /opt/homeu-commerce; docker compose build --no-cache 2>&1 | tail -10"
        
        if ($result.Success) {
            Write-Host "✅ Build complete (via $($result.Via))`n$($result.Output)" -ForegroundColor Green
        } else {
            Write-Host "❌ Build failed: $($result.Output)" -ForegroundColor Red
            exit 1
        }
    }

    'deploy' {
        if (-not (Invoke-ApprovalGate -Action "Full Deploy (git pull → build → restart)")) { exit 1 }
        
        if (Test-Lock -LockKey 'deploy') {
            Write-Host "⚠️  Deploy lock held. Queued." -ForegroundColor Yellow
            exit 1
        }

        Write-Banner "Starting Full Deploy" "Green"
        
        # Step 1: Pull latest
        Write-Host "1/4 Pulling latest code..." -ForegroundColor Cyan
        $pull = Invoke-VPSCommand "cd /opt/homeu-commerce; git pull 2>&1"
        if (-not $pull.Success) { Write-Host "❌ Git pull failed" -ForegroundColor Red; exit 1 }
        
        # Step 2: Build
        Write-Host "2/4 Building..." -ForegroundColor Cyan
        $build = Invoke-VPSCommand "cd /opt/homeu-commerce; docker compose build --no-cache 2>&1 | tail -10"
        if (-not $build.Success) { Write-Host "❌ Build failed" -ForegroundColor Red; exit 1 }
        
        # Step 3: Restart
        Write-Host "3/4 Restarting services..." -ForegroundColor Cyan
        $restart = Invoke-VPSCommand "cd /opt/homeu-commerce; docker compose up -d 2>&1"
        if (-not $restart.Success) { Write-Host "❌ Restart failed" -ForegroundColor Red; exit 1 }
        
        # Step 4: Health check
        Write-Host "4/4 Health check..." -ForegroundColor Cyan
        Start-Sleep -Seconds 8
        $health = Invoke-VPSCommand "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/; echo -n ' '; curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/admin"
        
        Write-Host "`n✅ Deploy complete!" -ForegroundColor Green
        Write-Host "  Homepage: $($health.Output.Split(' ')[0])"
        Write-Host "  Admin:    $($health.Output.Split(' ')[1])"
        Write-Host "  Via: $($pull.Via)"
    }

    'sync' {
        if (-not (Invoke-ApprovalGate -Action "Shopify Data Sync")) { exit 1 }
        Write-Banner "Syncing Shopify Data" "Green"
        $result = Invoke-VPSCommand "cd /opt/homeu-commerce; node tools/shopify-mcp/server.mjs --export 2>&1 | tail -10"
        Write-Host $result.Output
    }

    'scan' {
        if (-not (Invoke-ApprovalGate -Action "Playwright Scan")) { exit 1 }
        Write-Banner "Starting Site Scan" "Green"
        $result = Invoke-VPSCommand "cd /opt/homeu-commerce/tools/playwright-scanner; node scan.mjs --no-screenshots --delay 500 --max-pages 20 2>&1 | tail -10"
        Write-Host $result.Output
    }

    'pending' {
        Write-Banner "Checking Pending Commits" "Cyan"
        $deployerScript = Join-Path $ProjectRoot "tools\deployer-agent\deployer-mcp.mjs"
        node $deployerScript --pending 2>&1
    }

    'deploy-pending' {
        if (-not (Invoke-ApprovalGate -Action "Deploy ALL Pending Commits (git pull → build → restart)")) { exit 1 }
        Write-Banner "Deploying ALL Pending Commits" "Green"
        $deployerScript = Join-Path $ProjectRoot "tools\deployer-agent\deployer-mcp.mjs"
        node $deployerScript --deploy-pending 2>&1
    }
}
