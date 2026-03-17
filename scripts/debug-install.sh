#!/bin/bash
echo "=== /usr/local/lib/node_modules/winclaw contents ==="
ls -la /usr/local/lib/node_modules/winclaw/ 2>/dev/null || echo "dir not found"
echo "=== dist contents ==="
ls /usr/local/lib/node_modules/winclaw/dist/ 2>/dev/null | head -20
echo "=== Looking for package.json ==="
find /usr/local/lib/node_modules/winclaw -name package.json -maxdepth 2 2>/dev/null | head -5
echo "=== Looking for winclaw.mjs ==="
find /usr/local/lib/node_modules/winclaw -name "winclaw.mjs" -maxdepth 3 2>/dev/null
echo "=== Looking for cli.mjs or cli.js ==="
find /usr/local/lib/node_modules/winclaw -name "cli.*" -maxdepth 3 2>/dev/null | head -10
echo "=== dist mjs files ==="
find /usr/local/lib/node_modules/winclaw/dist -name "*.mjs" -maxdepth 1 2>/dev/null | head -10
echo "=== npm global bin ==="
ls -la $(npm bin -g) 2>/dev/null | grep winclaw
echo "=== npm list -g winclaw ==="
npm list -g winclaw 2>/dev/null
