# scripts/package-desktop.ps1
# GRC Desktop Packaging Script
# Usage: powershell -ExecutionPolicy Bypass -File scripts/package-desktop.ps1

param(
    [string]$NodeVersion = "22.12.0",
    [switch]$SkipBuild,
    [switch]$SkipElectron
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "=== GRC Desktop Packaging ===" -ForegroundColor Cyan

# --- 1. Build Dashboard ---
if (-not $SkipBuild) {
    Write-Host "[1/6] Building Dashboard..." -ForegroundColor Yellow
    Push-Location dashboard
    npm run build
    Pop-Location
}

# --- 2. Build Backend ---
if (-not $SkipBuild) {
    Write-Host "[2/6] Building Backend..." -ForegroundColor Yellow
    npx tsc
}

# --- 3. Prepare server distribution ---
Write-Host "[3/6] Preparing server distribution..." -ForegroundColor Yellow
$serverDist = "dist\server"
if (Test-Path $serverDist) { Remove-Item -Recurse -Force $serverDist }
New-Item -ItemType Directory -Force $serverDist | Out-Null

# Copy compiled backend
Copy-Item -Recurse "dist\*" "$serverDist\dist\" -Exclude "server","electron-out","node"
# Copy dashboard build
Copy-Item -Recurse "dashboard\dist" "$serverDist\dist\dashboard-dist"
# Copy package.json for production dependencies
Copy-Item "package.json" "$serverDist\"
Copy-Item "package-lock.json" "$serverDist\" -ErrorAction SilentlyContinue

# Install production-only dependencies
Push-Location $serverDist
npm install --omit=dev --ignore-scripts
Pop-Location

# Rebuild native modules (better-sqlite3)
Push-Location $serverDist
npx node-gyp rebuild --directory=node_modules/better-sqlite3
Pop-Location

# --- 4. Clean bloat ---
Write-Host "[4/6] Cleaning bloat..." -ForegroundColor Yellow

# Remove unnecessary files
Get-ChildItem -Path "$serverDist\node_modules" -Recurse -Include "*.ts","*.map","*.md","LICENSE*","CHANGELOG*","README*" |
  Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "$serverDist\node_modules" -Recurse -Directory -Filter "test" |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "$serverDist\node_modules" -Recurse -Directory -Filter "__tests__" |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "$serverDist\node_modules" -Recurse -Directory -Filter "docs" |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Remove @types (not needed at runtime)
$typesDir = "$serverDist\node_modules\@types"
if (Test-Path $typesDir) { Remove-Item -Recurse -Force $typesDir }

# --- 5. Download portable Node.js ---
Write-Host "[5/6] Downloading portable Node.js $NodeVersion..." -ForegroundColor Yellow
$nodeDir = "dist\node"
if (Test-Path $nodeDir) { Remove-Item -Recurse -Force $nodeDir }
New-Item -ItemType Directory -Force $nodeDir | Out-Null

$nodeUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"
$nodeZip = "dist\node-portable.zip"

if (-not (Test-Path $nodeZip)) {
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip
}
Expand-Archive -Path $nodeZip -DestinationPath "dist\node-temp" -Force
# Move node.exe only (strip npm, docs, etc.)
$nodeExtracted = "dist\node-temp\node-v$NodeVersion-win-x64"
Copy-Item "$nodeExtracted\node.exe" "$nodeDir\"
# Clean up
Remove-Item -Recurse -Force "dist\node-temp"

# --- 6. Package Electron ---
if (-not $SkipElectron) {
    Write-Host "[6/6] Packaging Electron..." -ForegroundColor Yellow
    Push-Location apps\electron
    npm install
    npm run package
    Pop-Location
}

# --- Summary ---
Write-Host ""
Write-Host "=== Packaging Complete ===" -ForegroundColor Green
Write-Host "Electron: dist\electron-out\grc-win32-x64\"
Write-Host "Server:   dist\server\"
Write-Host "Node.js:  dist\node\"
Write-Host ""
Write-Host "Next: Run Inno Setup with scripts\grc-windows-installer.iss"
