"""Fix sandbox winclaw.json: remove legacy top-level providers/auxiliaryKeys."""
import json
import requests

SANDBOX_ID = "e8d9f3c6-e5df-4ee7-a83d-12c83d9a88ed"
API_KEY = "dtn_8dd682c749bb453296ee9455991a82f016a1e74553755c278b83df2042d899bf"
BASE = f"https://proxy.app.daytona.io/toolbox/{SANDBOX_ID}"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# Read current config
r = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "cat /home/daytona/.winclaw/winclaw.json",
    "timeout": 10
})
config = json.loads(r.json()["result"])

# Remove legacy keys
changed = False
for key in ["providers", "auxiliaryKeys"]:
    if key in config:
        del config[key]
        changed = True
        print(f"  Removed top-level '{key}'")

if not changed:
    print("No legacy keys found, config is clean.")
else:
    # Write back
    config_json = json.dumps(config, indent=2)
    # Use node to write atomically
    script = f"""
const fs = require('fs');
const config = {config_json};
fs.writeFileSync('/home/daytona/.winclaw/winclaw.json', JSON.stringify(config, null, 2));
console.log('Config written successfully');
"""
    import base64
    b64 = base64.b64encode(script.encode()).decode()
    r2 = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
        "command": f"echo {b64} | base64 -d | node",
        "timeout": 15
    })
    print(f"  Write result: {r2.json()}")

# Verify
r3 = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "cat /home/daytona/.winclaw/winclaw.json | head -5",
    "timeout": 10
})
print(f"\n  Config head: {r3.json()['result']}")

# Also clear old log
r4 = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "echo '' > /home/daytona/.winclaw/gateway.log",
    "timeout": 10
})
print(f"  Log cleared: exit={r4.json()['exitCode']}")
