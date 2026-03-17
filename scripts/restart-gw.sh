#!/bin/bash
export HOME=/home/daytona
# Kill all node/winclaw processes
killall -9 node 2>/dev/null || true
killall -9 winclaw 2>/dev/null || true
sleep 2
# Start fresh
winclaw gateway > /tmp/gateway.log 2>&1 &
echo "gateway started with pid $!"
sleep 5
cat /tmp/gateway.log
