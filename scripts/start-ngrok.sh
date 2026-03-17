#!/bin/bash
export HOME=/home/daytona
# Kill existing ngrok
killall ngrok 2>/dev/null || true
sleep 1
# Start ngrok
ngrok tcp 18789 > /tmp/ngrok.log 2>&1 &
echo "ngrok started with pid $!"
sleep 3
# Get tunnel URL
curl -s http://127.0.0.1:4040/api/tunnels
