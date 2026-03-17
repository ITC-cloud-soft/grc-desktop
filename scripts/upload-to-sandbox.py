"""Upload winclaw tgz to Daytona sandbox via toolbox API."""
import sys
import requests

SANDBOX_ID = "635f7a42-21a7-46c5-9fcb-93dc4a647895"
API_KEY = "dtn_8dd682c749bb453296ee9455991a82f016a1e74553755c278b83df2042d899bf"
PROXY_URL = f"https://proxy.app.daytona.io/toolbox/{SANDBOX_ID}/files/upload"

file_path = sys.argv[1] if len(sys.argv) > 1 else "C:/work/winclaw/winclaw-2026.3.14.tgz"
dest_path = sys.argv[2] if len(sys.argv) > 2 else "/tmp/winclaw.tgz"

headers = {"Authorization": f"Bearer {API_KEY}"}

print(f"Uploading {file_path} to {dest_path} in sandbox {SANDBOX_ID}...")

with open(file_path, "rb") as f:
    files = {"file": (file_path.split("/")[-1], f)}
    params = {"path": dest_path}
    r = requests.post(PROXY_URL, headers=headers, files=files, params=params, timeout=300)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:500]}")
