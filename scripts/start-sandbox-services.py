"""
Start WinClaw gateway + ngrok in the Daytona sandbox.
Uses Daytona Python SDK to execute commands remotely.
"""
import os
import sys
import time

from daytona import Daytona, DaytonaConfig

SANDBOX_ID = "decb3c57-66f0-44ae-87c5-39f682184c03"
NGROK_TOKEN = "33mnxdKV65DPliNxPvjvDIjuriU_7smrcN113vKCsY94tTXuk"

def main():
    config = DaytonaConfig()
    daytona = Daytona(config)
    sandbox = daytona.get_current_sandbox(SANDBOX_ID)

    print("=== Starting services in sandbox ===")
    print(f"Sandbox: {SANDBOX_ID}")

    # 1. Start WinClaw gateway
    print("\n[1] Starting WinClaw gateway...")
    resp = sandbox.process.exec(
        "bash -c 'winclaw gateway --allow-unconfigured > /home/daytona/.winclaw/gateway.log 2>&1 & echo PID=$!'"
    )
    print(f"  Result: {resp.result}")

    # 2. Wait for gateway to start
    print("\n[2] Waiting for gateway to start (5s)...")
    time.sleep(5)

    # 3. Check gateway is listening
    resp = sandbox.process.exec("bash -c 'curl -s http://127.0.0.1:18789/health || echo NOT_UP'")
    print(f"  Gateway health: {resp.result[:200] if resp.result else 'no response'}")

    # 4. Configure ngrok
    print("\n[3] Configuring ngrok auth...")
    resp = sandbox.process.exec(f"ngrok config add-authtoken {NGROK_TOKEN}")
    print(f"  Result: {resp.result}")

    # 5. Start ngrok tunnel
    print("\n[4] Starting ngrok tunnel...")
    resp = sandbox.process.exec(
        "bash -c 'ngrok http 18789 --log /home/daytona/.winclaw/ngrok.log --log-format logfmt > /dev/null 2>&1 & echo PID=$!'"
    )
    print(f"  Result: {resp.result}")

    # 6. Wait for tunnel
    print("\n[5] Waiting for ngrok tunnel (8s)...")
    time.sleep(8)

    # 7. Get public URL
    print("\n[6] Getting ngrok public URL...")
    resp = sandbox.process.exec(
        "python3 -c \"import urllib.request,json; d=json.loads(urllib.request.urlopen('http://127.0.0.1:4040/api/tunnels').read()); print(d['tunnels'][0]['public_url'] if d.get('tunnels') else 'NO_TUNNEL')\""
    )
    ngrok_url = resp.result.strip() if resp.result else ""

    if ngrok_url and ngrok_url != "NO_TUNNEL":
        print(f"\n{'='*50}")
        print(f"  ngrok URL:  {ngrok_url}")
        print(f"  Gateway:    {ngrok_url}/chat?session=agent%3Amain%3Amain")
        print(f"{'='*50}")

        # Save URL
        sandbox.process.exec(f"bash -c 'echo {ngrok_url} > /home/daytona/.winclaw/ngrok-url.txt'")
    else:
        print("  WARNING: Could not get ngrok URL")
        # Try reading ngrok log
        resp = sandbox.process.exec("tail -20 /home/daytona/.winclaw/ngrok.log")
        print(f"  ngrok log:\n{resp.result}")

if __name__ == "__main__":
    main()
