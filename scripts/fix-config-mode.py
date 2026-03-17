"""Fix winclaw.json to add gateway.mode=local and upload to sandbox."""
import requests
import json

SANDBOX_ID = "635f7a42-21a7-46c5-9fcb-93dc4a647895"
API_KEY = "dtn_8dd682c749bb453296ee9455991a82f016a1e74553755c278b83df2042d899bf"
BASE = f"https://proxy.app.daytona.io/toolbox/{SANDBOX_ID}"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# Read current config
r = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "cat /home/daytona/.winclaw/winclaw.json",
    "timeout": 10
})
config = json.loads(r.json()["result"])

# Add gateway.mode = "local"
config["gateway"]["mode"] = "local"

# Write updated config via file upload
config_json = json.dumps(config, indent=2)
r = requests.post(
    f"{BASE}/files/upload",
    headers=HEADERS,
    files={"file": ("winclaw.json", config_json.encode("utf-8"), "application/json")},
    params={"path": "/home/daytona/.winclaw/winclaw.json"},
    timeout=30
)
print(f"Upload status: {r.status_code}")

# Verify
r = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "cat /home/daytona/.winclaw/winclaw.json | python3 -c \"import json,sys; c=json.load(sys.stdin); print('gateway.mode:', c.get('gateway',{}).get('mode','MISSING'))\"",
    "timeout": 10
})
print(f"Verify: {r.json().get('result', '')}")
