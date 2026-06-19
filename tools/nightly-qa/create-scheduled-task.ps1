# HomeU Nightly QA — Windows Scheduled Task
# Run once as Administrator to create a daily 2:00 AM task
#
# Usage: powershell -ExecutionPolicy Bypass -File tools/nightly-qa/create-scheduled-task.ps1

$ErrorActionPreference = "Stop"
$taskName = "HomeU Nightly QA"
$scriptPath = Join-Path $PSScriptRoot "run-nightly-qa.mjs"
$nodePath = (Get-Command node).Source
$workingDir = Resolve-Path (Join-Path $PSScriptRoot ".." "..")
$logDir = Join-Path $workingDir "memory\nightly-reports"

# Ensure log directory exists
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Remove existing task if present
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing task '$taskName'..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the scheduled task
$action = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$scriptPath`"" -WorkingDirectory $workingDir
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10) -ExecutionTimeLimit (New-TimeSpan -Hours 4)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "HomeU Commerce Nightly QA — runs 2am-6am daily to test all features, find bugs/gaps, and research improvements"

Write-Host "✅ Scheduled task '$taskName' created successfully."
Write-Host "   Runs daily at 2:00 AM"
Write-Host "   Script: $scriptPath"
Write-Host "   Logs: $logDir"
Write-Host ""
Write-Host "To run manually:"
Write-Host "  Start-ScheduledTask -TaskName '$taskName'"
Write-Host ""
Write-Host "To remove:"
Write-Host "  Unregister-ScheduledTask -TaskName '$taskName'"
