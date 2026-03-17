"""Fix sandbox winclaw.json by uploading a clean version."""
import json
import io
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
for key in ["providers", "auxiliaryKeys"]:
    if key in config:
        del config[key]
        print(f"Removed '{key}'")

# Write clean config via file upload API
clean_json = json.dumps(config, indent=2)
print(f"\nClean config size: {len(clean_json)} bytes")

buf = io.BytesIO(clean_json.encode("utf-8"))
files = {"file": ("winclaw.json", buf)}
params = {"path": "/home/daytona/.winclaw/winclaw.json"}
r2 = requests.post(f"{BASE}/files/upload", headers=HEADERS, files=files, params=params, timeout=30)
print(f"Upload status: {r2.status_code}")

# Verify
r3 = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "cat /home/daytona/.winclaw/winclaw.json",
    "timeout": 10
})
c3 = json.loads(r3.json()["result"])
print(f"\nVerification:")
print(f"  Has 'providers' top-level? {'providers' in c3}")
print(f"  Has 'auxiliaryKeys' top-level? {'auxiliaryKeys' in c3}")
print(f"  Has models.providers? {'providers' in c3.get('models', {})}")
print(f"  Default model: {c3.get('agents',{}).get('defaults',{}).get('model','NONE')}")
