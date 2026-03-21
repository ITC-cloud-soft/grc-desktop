@echo off
setlocal
echo === Building GRC Desktop ===

REM 1. Build Dashboard (vite only — skip tsc type-check for speed)
echo [1/4] Building Dashboard...
cd dashboard
call npx vite build
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
cd ..

REM 2. Build Backend
echo [2/4] Building Backend...
call npx tsc
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

REM 3. Copy migration files (not handled by tsc)
echo [3/4] Copying migration files...
xcopy /e /i /q /y src\shared\db\migrations dist\shared\db\migrations

REM 4. Copy Dashboard to dist
echo [4/4] Copying Dashboard to dist...
if exist dist\dashboard-dist rmdir /s /q dist\dashboard-dist
xcopy /e /i /q dashboard\dist dist\dashboard-dist

echo === Build complete! ===
echo Run: set GRC_DB_DIALECT=sqlite ^& node dist\index.js
