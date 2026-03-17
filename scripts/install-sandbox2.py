"""Install winclaw in sandbox and restart gateway."""
import requests
import time
import sys

SANDBOX_ID = "635f7a42-21a7-46c5-9fcb-93dc4a647895"
API_KEY = "dtn_8dd682c749bb453296ee9455991a82f016a1e74553755c278b83df2042d899bf"
BASE = f"https://proxy.app.daytona.io/toolbox/{SANDBOX_ID}"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}


def run(cmd, timeout=30):
    try:
        r = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
            "command": cmd,
            "timeout": timeout
        }, timeout=timeout + 30)
        if r.status_code == 200:
            data = r.json()
            return data.get("result", "(empty)")
        else:
            return f"HTTP {r.status_code}: {r.text[:300]}"
    except Exception as e:
        return f"Error: {e}"


step = sys.argv[1] if len(sys.argv) > 1 else "all"

if step in ("stop", "all"):
    print("=== Stopping gateway ===")
    print(run("killall node 2>/dev/null; killall winclaw 2>/dev/null; echo done"))
    time.sleep(2)

if step in ("install", "all"):
    print("=== Installing new WinClaw ===")
    result = run("sudo npm install -g /tmp/winclaw.tgz", timeout=180)
    print(result[-800:] if len(result) > 800 else result)
    print("=== Version check ===")
    print(run("winclaw --version"))

if step in ("help", "all"):
    print("=== Gateway help ===")
    print(run("winclaw gateway --help"))

if step in ("start", "all"):
    print("=== Starting gateway ===")
    # Use env vars instead of flags if flags cause issues
    print(run("WINCLAW_PORT=3000 nohup winclaw gateway > /tmp/gateway.log 2>&1 & echo started"))
    time.sleep(5)
    print("=== Gateway logs ===")
    print(run("cat /tmp/gateway.log"))
