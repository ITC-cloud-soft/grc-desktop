#!/bin/bash
export HOME=/home/daytona
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
echo "=== Kill PID 107 and all node ==="
sudo kill -9 107 2>/dev/null || echo "kill 107 failed"
sudo kill -9 $(ps aux | grep -E "node|winclaw" | grep -v grep | awk '{print $2}') 2>/dev/null || echo "no procs"
sleep 2
echo "=== Remaining procs ==="
ps aux | grep -E "node|winclaw|gateway" | grep -v grep || echo "none"
echo "=== Remove lock ==="
rm -f /home/daytona/.winclaw/.gateway.lock 2>/dev/null || true
echo "=== Starting gateway ==="
node /usr/local/lib/node_modules/winclaw/winclaw.mjs gateway > /tmp/gateway.log 2>&1 &
echo "gateway pid: $!"
sleep 8
echo "=== Gateway logs ==="
cat /tmp/gateway.log
