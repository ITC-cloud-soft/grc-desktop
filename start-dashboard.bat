@echo off
title GRC Dashboard (port 3200)
cd /d "%~dp0dashboard"
echo ========================================
echo   GRC Dashboard - localhost:3200
echo ========================================
echo.
npm run dev
pause
