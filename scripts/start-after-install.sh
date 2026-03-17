#!/bin/bash
export HOME=/home/daytona
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
echo "=== Creating bin symlink ==="
sudo ln -sf ../lib/node_modules/winclaw/winclaw.mjs /usr/local/bin/winclaw
ls -la /usr/local/bin/winclaw
echo "=== Version ==="
node /usr/local/lib/node_modules/winclaw/winclaw.mjs --version 2>&1
echo "=== Starting gateway ==="
rm -f /home/daytona/.winclaw/.gateway.lock 2>/dev/null || true
node /usr/local/lib/node_modules/winclaw/winclaw.mjs gateway > /tmp/gateway.log 2>&1 &
echo "gateway pid: $!"
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
