#!/bin/bash
set -e
echo "=== Building GRC Desktop ==="

# 1. Build Dashboard (vite only — skip tsc type-check for speed)
echo "[1/4] Building Dashboard..."
cd dashboard
npx vite build
cd ..

# 2. Build Backend
echo "[2/4] Building Backend..."
npx tsc

# 3. Copy migration files (not handled by tsc)
echo "[3/4] Copying migration files..."
mkdir -p dist/shared/db/migrations
cp -r src/shared/db/migrations dist/shared/db/

# 4. Copy Dashboard to dist
echo "[4/4] Copying Dashboard to dist..."
rm -rf dist/dashboard-dist
cp -r dashboard/dist dist/dashboard-dist

echo "=== Build complete! ==="
echo "Run: GRC_DB_DIALECT=sqlite node dist/index.js"
