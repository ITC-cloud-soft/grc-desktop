@echo off
title GRC Server (port 3100)
cd /d "%~dp0"
echo ========================================
echo   GRC Backend Server - localhost:3100
echo ========================================
echo.
npm run dev
pause
