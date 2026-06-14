#!/usr/bin/env pwsh
# HomeU Pre-Push Hook (PowerShell) — Ensures deployer coordination
# To install: git config core.hooksPath .githooks

Write-Host "🔍 HomeU Deployer Check" -ForegroundColor Cyan

$commitSha = git rev-parse HEAD 2>$null
$branch = git rev-parse --abbrev-ref HEAD 2>$null

Write-Host "📤 Pushing $branch ($commitSha)" -ForegroundColor Yellow

# Try to log to deployer history
try {
    $env:PGPASSWORD = "homeu_local_password"
    $result = psql -h localhost -p 5432 -U homeu -d homeu -c "INSERT INTO deployer_history (commit_sha, branch, status, deployed_by) VALUES ('$commitSha', '$branch', 'pushed', 'git-pre-push-windows')" 2>&1
    Write-Host "✅ Push logged to Deployer Agent" -ForegroundColor Green
}
catch {
    Write-Host "ℹ️  Deployer log skipped (deployer may not be running)" -ForegroundColor Gray
}

exit 0
