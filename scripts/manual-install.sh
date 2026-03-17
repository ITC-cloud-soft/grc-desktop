#!/bin/bash
export HOME=/home/daytona
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
echo "=== Stopping gateway ==="
killall -9 node 2>/dev/null || true
killall -9 winclaw-gateway 2>/dev/null || true
sleep 2
rm -f /home/daytona/.winclaw/.gateway.lock 2>/dev/null || true
echo "=== Manual install: extracting tgz ==="
cd /usr/local/lib/node_modules
sudo rm -rf winclaw 2>/dev/null || true
sudo mkdir -p winclaw
cd winclaw
sudo tar xzf /tmp/winclaw.tgz --strip-components=1
echo "=== Verify package.json ==="
ls -la package.json winclaw.mjs 2>/dev/null
echo "=== Create symlink ==="
sudo rm -f /usr/local/bin/winclaw 2>/dev/null || true
sudo ln -sf /usr/local/lib/node_modules/winclaw/winclaw.mjs /usr/local/bin/winclaw
sudo chmod +x /usr/local/lib/node_modules/winclaw/winclaw.mjs
echo "=== Install dependencies ==="
sudo npm install --omit=dev 2>&1 | tail -3
echo "=== Version ==="
winclaw --version 2>&1 || node /usr/local/lib/node_modules/winclaw/winclaw.mjs --version 2>&1
echo "=== Starting gateway ==="
winclaw gateway > /tmp/gateway.log 2>&1 &
GWPID=$!
echo "gateway pid: $GWPID"
sleep 8
echo "=== Gateway logs ==="
cat /tmp/gateway.log
echo "=== Starting ngrok ==="
killall ngrok 2>/dev/null || true
sleep 1
ngrok tcp 18789 > /tmp/ngrok.log 2>&1 &
sleep 3
echo "=== ngrok tunnels ==="
curl -s http://127.0.0.1:4040/api/tunnels
