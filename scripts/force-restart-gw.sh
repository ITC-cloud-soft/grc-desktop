#!/bin/bash
export HOME=/home/daytona
echo "=== Current processes ==="
ps aux | grep -E "winclaw|node|gateway" | grep -v grep
echo "=== Killing PID 8203 ==="
kill -9 8203 2>/dev/null || echo "kill 8203 failed"
echo "=== Killing PID 8175 ==="
kill -9 8175 2>/dev/null || echo "kill 8175 failed"
echo "=== Killing PID 8219 ==="
kill -9 8219 2>/dev/null || echo "kill 8219 failed"
echo "=== Killing PID 8252 ==="
kill -9 8252 2>/dev/null || echo "kill 8252 failed"
echo "=== Kill all node ==="
kill -9 $(ps aux | grep node | grep -v grep | awk '{print $2}') 2>/dev/null || echo "no node procs"
sleep 2
echo "=== Remaining processes ==="
ps aux | grep -E "winclaw|node|gateway" | grep -v grep || echo "none"
echo "=== Removing lockfile ==="
rm -f /home/daytona/.winclaw/.gateway.lock 2>/dev/null || true
echo "=== Starting gateway ==="
winclaw gateway > /tmp/gateway.log 2>&1 &
echo "gateway started with pid $!"
sleep 8
echo "=== Gateway logs ==="
cat /tmp/gateway.log
