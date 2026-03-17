#!/bin/bash
echo "=== dist/entry.js exists? ==="
ls -la /usr/local/lib/node_modules/winclaw/dist/entry.js 2>/dev/null || echo "NOT FOUND"
echo "=== dist file count ==="
ls /usr/local/lib/node_modules/winclaw/dist/ 2>/dev/null | wc -l
echo "=== total file count ==="
find /usr/local/lib/node_modules/winclaw -type f 2>/dev/null | wc -l
echo "=== node_modules exists? ==="
ls -d /usr/local/lib/node_modules/winclaw/node_modules 2>/dev/null || echo "NO node_modules"
echo "=== node_modules count ==="
ls /usr/local/lib/node_modules/winclaw/node_modules/ 2>/dev/null | wc -l
echo "=== Try running entry.js directly ==="
node /usr/local/lib/node_modules/winclaw/dist/entry.js --version 2>&1 | head -5
echo "=== Try winclaw.mjs ==="
node /usr/local/lib/node_modules/winclaw/winclaw.mjs --version 2>&1 | head -5
