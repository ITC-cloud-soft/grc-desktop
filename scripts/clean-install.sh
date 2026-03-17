#!/bin/bash
export HOME=/home/daytona
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
echo "=== Stopping all ==="
killall -9 node 2>/dev/null || true
killall -9 winclaw-gateway 2>/dev/null || true
sleep 2
rm -f /home/daytona/.winclaw/.gateway.lock 2>/dev/null || true
echo "=== Cleaning old install ==="
sudo rm -rf /usr/local/lib/node_modules/winclaw 2>/dev/null || true
sudo rm -f /usr/local/bin/winclaw 2>/dev/null || true
echo "=== npm install -g ==="
sudo npm install -g /tmp/winclaw.tgz 2>&1 | tail -10
echo "=== Check install ==="
ls -la /usr/local/lib/node_modules/winclaw/package.json 2>/dev/null || echo "package.json MISSING"
ls -la /usr/local/lib/node_modules/winclaw/winclaw.mjs 2>/dev/null || echo "winclaw.mjs MISSING"
ls -d /usr/local/lib/node_modules/winclaw/node_modules 2>/dev/null || echo "node_modules MISSING"
ls /usr/local/lib/node_modules/winclaw/node_modules/ 2>/dev/null | wc -l
echo "=== Check bin link ==="
ls -la /usr/local/bin/winclaw 2>/dev/null || echo "bin link MISSING"
which winclaw 2>/dev/null || echo "winclaw not in PATH"
echo "=== Version ==="
winclaw --version 2>&1 || echo "winclaw command failed"
