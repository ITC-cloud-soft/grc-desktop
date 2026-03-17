"""Install winclaw in sandbox and restart gateway."""
import requests
import json
import time

SANDBOX_ID = "635f7a42-21a7-46c5-9fcb-93dc4a647895"
API_KEY = "dtn_8dd682c749bb453296ee9455991a82f016a1e74553755c278b83df2042d899bf"
BASE = f"https://proxy.app.daytona.io/toolbox/{SANDBOX_ID}"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}


def run(cmd, timeout=30):
    r = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
        "command": cmd,
        "timeout": timeout
    })
    data = r.json()
    return data.get("result", "")


# Stop existing gateway
print("=== Stopping gateway ===")
print(run("pkill -f winclaw || true"))

time.sleep(2)

# Install new version
print("=== Installing new WinClaw ===")
result = run("sudo npm install -g /tmp/winclaw.tgz", timeout=120)
print(result[-500:] if len(result) > 500 else result)

# Verify version
print("=== Version check ===")
print(run("winclaw --version"))

# Start gateway with correct flags
print("=== Starting gateway ===")
result = run("nohup winclaw gateway --port 3000 > /tmp/gateway.log 2>&1 &", timeout=10)
print(result)

time.sleep(5)

# Check gateway logs
print("=== Gateway logs ===")
print(run("tail -n 30 /tmp/gateway.log"))
