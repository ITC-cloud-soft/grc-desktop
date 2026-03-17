"""Upload a shell script to sandbox and run it."""
import requests
import sys
import time

SANDBOX_ID = "635f7a42-21a7-46c5-9fcb-93dc4a647895"
API_KEY = "dtn_8dd682c749bb453296ee9455991a82f016a1e74553755c278b83df2042d899bf"
BASE = f"https://proxy.app.daytona.io/toolbox/{SANDBOX_ID}"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

script_path = sys.argv[1] if len(sys.argv) > 1 else "C:/work/grc/scripts/restart-gw.sh"
timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 30

# Upload script
with open(script_path, "rb") as f:
    r = requests.post(
        f"{BASE}/files/upload",
        headers=HEADERS,
        files={"file": ("script.sh", f)},
        params={"path": "/tmp/script.sh"},
        timeout=30
    )
print(f"Upload: {r.status_code}")

# Make executable and run
r = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "bash /tmp/script.sh",
    "timeout": timeout
}, timeout=timeout + 30)

if r.status_code == 200:
    result = r.json().get("result", "(empty)")
    print(result.encode("utf-8", errors="replace").decode("utf-8"))
else:
    print(f"HTTP {r.status_code}: {r.text[:500]}")
