"""Test small file upload to Daytona sandbox."""
import io
import requests

SANDBOX_ID = "e8d9f3c6-e5df-4ee7-a83d-12c83d9a88ed"
API_KEY = "dtn_8dd682c749bb453296ee9455991a82f016a1e74553755c278b83df2042d899bf"
url = f"https://proxy.app.daytona.io/toolbox/{SANDBOX_ID}/files/upload"
headers = {"Authorization": f"Bearer {API_KEY}"}

f = io.BytesIO(b"hello test upload")
files = {"file": ("test.txt", f)}
params = {"path": "/tmp/test-upload.txt"}
r = requests.post(url, headers=headers, files=files, params=params, timeout=30)
print(f"Status: {r.status_code}")
print(f"Response: {r.text[:500]}")

# Also try with just directory path
f2 = io.BytesIO(b"hello test upload v2")
files2 = {"file": ("test2.txt", f2)}
params2 = {"path": "/tmp"}
r2 = requests.post(url, headers=headers, files=files2, params=params2, timeout=30)
print(f"\nWith dir path:")
print(f"Status: {r2.status_code}")
print(f"Response: {r2.text[:500]}")

# Try via main API instead of proxy
url3 = f"https://app.daytona.io/api/sandbox/{SANDBOX_ID}/toolbox/files/upload"
f3 = io.BytesIO(b"hello test upload v3")
files3 = {"file": ("test3.txt", f3)}
params3 = {"path": "/tmp/test3.txt"}
r3 = requests.post(url3, headers=headers, files=files3, params=params3, timeout=30)
print(f"\nVia main API:")
print(f"Status: {r3.status_code}")
print(f"Response: {r3.text[:500]}")
