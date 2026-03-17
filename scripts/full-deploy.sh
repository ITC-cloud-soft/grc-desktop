#!/bin/bash
export HOME=/home/daytona
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
echo "=== Stopping gateway ==="
killall -9 node 2>/dev/null || true
killall -9 winclaw-gateway 2>/dev/null || true
sleep 2
rm -f /home/daytona/.winclaw/.gateway.lock 2>/dev/null || true
echo "=== Installing ==="
sudo npm install -g /tmp/winclaw.tgz 2>&1 | tail -3
echo "=== Finding entry point ==="
WINCLAW_PKG="/usr/local/lib/node_modules/winclaw"
ls "$WINCLAW_PKG/winclaw.mjs" 2>/dev/null || echo "winclaw.mjs not found"
ls "$WINCLAW_PKG/dist/"*.mjs 2>/dev/null | head -5 || echo "no mjs in dist"
ls "$WINCLAW_PKG/" | head -20
echo "=== package.json bin ==="
cat "$WINCLAW_PKG/package.json" | grep -A5 '"bin"'
echo "=== Creating wrapper ==="
cat > /tmp/winclaw-run.sh << 'SCRIPT'
#!/bin/bash
export HOME=/home/daytona
WINCLAW_PKG="/usr/local/lib/node_modules/winclaw"
ENTRY=$(cat "$WINCLAW_PKG/package.json" | python3 -c "import json,sys; d=json.load(sys.stdin); b=d.get('bin',{}); print(list(b.values())[0] if isinstance(b,dict) else b)" 2>/dev/null)
exec node "$WINCLAW_PKG/$ENTRY" "$@"
SCRIPT
chmod +x /tmp/winclaw-run.sh
echo "=== Version ==="
/tmp/winclaw-run.sh --version
echo "=== Starting gateway ==="
/tmp/winclaw-run.sh gateway > /tmp/gateway.log 2>&1 &
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
