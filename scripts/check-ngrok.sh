#!/bin/bash
echo "=== Check ngrok ==="
curl -s http://127.0.0.1:4040/api/tunnels || echo "ngrok not running"
