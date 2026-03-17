"""Verify sandbox winclaw.json state."""
import json
import requests

SANDBOX_ID = "e8d9f3c6-e5df-4ee7-a83d-12c83d9a88ed"
API_KEY = "dtn_8dd682c749bb453296ee9455991a82f016a1e74553755c278b83df2042d899bf"
BASE = f"https://proxy.app.daytona.io/toolbox/{SANDBOX_ID}"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# Read config
r = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "cat /home/daytona/.winclaw/winclaw.json",
    "timeout": 10
})
c = json.loads(r.json()["result"])

print("=== Config Verification ===")
print(f"Top-level keys: {list(c.keys())}")
print(f"Has legacy 'providers'? {'providers' in c}")
print(f"Has legacy 'auxiliaryKeys'? {'auxiliaryKeys' in c}")

m = c.get("models", {}).get("providers", {})
print(f"\nmodels.providers keys: {list(m.keys())}")
for name, prov in m.items():
    url = prov.get("baseUrl", "?")[:50]
    models = [x["id"] for x in prov.get("models", [])]
    has_key = "yes" if prov.get("apiKey") else "no"
    print(f"  {name}: baseUrl={url}..., apiKey={has_key}, models={models}")

print(f"\nDefault model: {c.get('agents', {}).get('defaults', {}).get('model', 'NONE')}")

# Check GRC state file
r2 = requests.post(f"{BASE}/process/execute", headers=HEADERS, json={
    "command": "cat /home/daytona/.winclaw/.grc-key-providers.json 2>/dev/null",
    "timeout": 10
})
result = r2.json().get("result", "").strip()
if result:
    state = json.loads(result)
    print(f"\nGRC state file: {json.dumps(state)}")
else:
    print("\nGRC state file: not found (first run may not have created it yet)")
