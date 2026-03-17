"""Start gateway and check logs."""
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
            result = data.get("result", "(empty)")
            return result.encode("utf-8", errors="replace").decode("utf-8")
        else:
            return f"HTTP {r.status_code}: {r.text[:300]}"
    except Exception as e:
        return f"Error: {e}"


def upload_file(local_path, remote_path):
    with open(local_path, "rb") as f:
        r = requests.post(
            f"{BASE}/files/upload",
            headers=HEADERS,
            files={"file": (remote_path.split("/")[-1], f)},
            params={"path": remote_path},
            timeout=30
        )
    return r.status_code


step = sys.argv[1] if len(sys.argv) > 1 else "start"

if step == "start":
    # Upload the start script
    print("=== Uploading start script ===")
    status = upload_file("C:/work/grc/scripts/start-gw.sh", "/tmp/start-gw.sh")
    print(f"Upload status: {status}")
    print(run("chmod +x /tmp/start-gw.sh"))
    print("=== Starting gateway ===")
    print(run("bash /tmp/start-gw.sh"))
    time.sleep(8)
    print("=== Gateway logs ===")
    print(run("cat /tmp/gateway.log"))

elif step == "logs":
    print(run("cat /tmp/gateway.log"))

elif step == "config":
    print(run("cat /home/daytona/.winclaw/winclaw.json"))

elif step == "ngrok":
    print("=== Starting ngrok ===")
    authtoken = "33mnxdKV65DPliNxPvjvDIjuriU_7smrcN113vKCsY94tTXuk"
    print(run(f"ngrok config add-authtoken {authtoken}"))
    status = upload_file("C:/work/grc/scripts/start-ngrok.sh", "/tmp/start-ngrok.sh")
    print(f"Upload ngrok script: {status}")
    print(run("chmod +x /tmp/start-ngrok.sh && bash /tmp/start-ngrok.sh"))
    time.sleep(3)
    print(run("curl -s http://127.0.0.1:4040/api/tunnels"))
