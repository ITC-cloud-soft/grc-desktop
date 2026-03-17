"""Set up 3 WinClaw Daytona sandboxes with latest winclaw and GRC URL."""
import os, time

os.environ.setdefault("DAYTONA_API_KEY", os.environ.get("DAYTONA_API_KEY", ""))

from daytona import Daytona, DaytonaConfig

NGROK_URL = "https://postarterial-holstered-beata.ngrok-free.dev"

SANDBOX_IDS = {
    "winclaw-node-1": "a99220df-38ee-4c35-bb62-5a89eaa5abe7",
    "winclaw-node-2": "95841f03-6882-4762-a992-d95bb61d99c7",
    "winclaw-node-3": "0d69d791-5bf6-442d-818a-3ea50338d3e3",
}

def setup_node(d, name, sandbox_id):
    print(f"\n{'='*60}")
    print(f"  Setting up {name} ({sandbox_id})")
    print(f"{'='*60}")

    sb = d.get_current_sandbox(sandbox_id)

    # 1. Check current winclaw version
    print("[1] Checking current winclaw version...")
    r = sb.process.exec("winclaw --version")
    print(f"  Current: {r.result.strip() if r.result else 'unknown'}")

    # 2. Upgrade winclaw to latest
    print("[2] Upgrading winclaw to 2026.3.15...")
    r = sb.process.exec("npm install -g winclaw@2026.3.15")
    output = r.result if r.result else ""
    # Show last few lines
    lines = output.strip().split("\n")
    for line in lines[-5:]:
        print(f"  {line}")

    # 3. Verify new version
    print("[3] Verifying version...")
    r = sb.process.exec("winclaw --version")
    print(f"  New version: {r.result.strip() if r.result else 'unknown'}")

    # 4. Write GRC config
    print(f"[4] Configuring GRC URL → {NGROK_URL}")
    config_json = f'''{{
  "gateway": {{
    "controlUi": {{
      "allowedOrigins": ["*"],
      "dangerouslyDisableDeviceAuth": true
    }},
    "auth": {{ "mode": "none" }}
  }},
  "grc": {{
    "url": "{NGROK_URL}"
  }}
}}'''
    sb.process.exec(f"mkdir -p /home/daytona/.winclaw")
    sb.process.exec(f"cat > /home/daytona/.winclaw/winclaw.json << 'EOFCONFIG'\n{config_json}\nEOFCONFIG")

    r = sb.process.exec("cat /home/daytona/.winclaw/winclaw.json")
    print(f"  Config: {r.result.strip()[:100]}...")

    # 5. Kill existing gateway if running
    print("[5] Restarting gateway...")
    sb.process.exec("pkill -f 'winclaw gateway' || true")
    time.sleep(2)

    # 6. Start gateway in background
    sb.process.exec("nohup winclaw gateway --allow-unconfigured > /home/daytona/.winclaw/gateway.log 2>&1 &")
    time.sleep(3)

    # 7. Check gateway health
    print("[6] Checking gateway health...")
    r = sb.process.exec("curl -s http://127.0.0.1:18789/health 2>/dev/null || echo 'NOT_UP'")
    print(f"  Health: {r.result.strip() if r.result else 'no response'}")

    # 8. Get device ID
    r = sb.process.exec("cat /home/daytona/.winclaw/identity/device.json 2>/dev/null || echo '{}'")
    print(f"  Identity: {r.result.strip()[:200] if r.result else 'none'}")

    print(f"  ✅ {name} setup complete")

def main():
    config = DaytonaConfig()
    d = Daytona(config)

    for name, sid in SANDBOX_IDS.items():
        try:
            setup_node(d, name, sid)
        except Exception as e:
            print(f"  ❌ Error setting up {name}: {e}")

if __name__ == "__main__":
    main()
