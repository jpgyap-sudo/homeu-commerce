@echo off
REM ================================================
REM  HomeU Deployer Agent — Auto-Start Script
REM  Run this at Windows startup or VS Code launch
REM  Keeps the Deployer MCP running persistently
REM ================================================

echo 🚀 HomeU Deployer Agent — Starting...
echo   PID: %random%
echo   Database: Central Brain PostgreSQL
echo   Extensions: All coding extensions coordinate through this agent
echo.

:restart
node "%~dp0deployer-mcp.mjs" 2>&1
echo [!] Deployer agent stopped. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto restart
