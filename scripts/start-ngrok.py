"""Start ngrok TCP tunnel in the Daytona sandbox."""
import time
from daytona import Daytona, DaytonaConfig

SANDBOX_ID = "e8d9f3c6-e5df-4ee7-a83d-12c83d9a88ed"

def main():
    config = DaytonaConfig()
    d = Daytona(config)
    sb = d.get_current_sandbox(SANDBOX_ID)

    # Check gateway health first
    print("[1] Checking gateway health...")
    r = sb.process.exec("bash -c 'curl -s http://127.0.0.1:18789/health || echo NOT_UP'")
    print(f"  Gateway: {r.result[:200] if r.result else 'no response'}")

    # Kill any existing ngrok
    print("\n[2] Killing any existing ngrok...")
    sb.process.exec("bash -c 'pkill -f ngrok || true'")
    time.sleep(1)

    # Start ngrok TCP tunnel
    print("\n[3] Starting ngrok TCP tunnel...")
    r = sb.process.exec(
        "bash -c 'nohup ngrok tcp 18789 --log /home/daytona/.winclaw/ngrok.log --log-format logfmt > /dev/null 2>&1 & echo PID=$!'"
    )
    print(f"  Result: {r.result}")

    # Wait for tunnel
    print("\n[4] Waiting for ngrok tunnel (8s)...")
    time.sleep(8)

    # Check ngrok process
    r = sb.process.exec("bash -c 'pgrep -a ngrok || echo NO_NGROK'")
    print(f"  ngrok process: {r.result}")

    # Get public URL from ngrok API
    print("\n[5] Getting ngrok public URL...")
    r = sb.process.exec(
        "python3 -c \"import urllib.request,json; d=json.loads(urllib.request.urlopen('http://127.0.0.1:4040/api/tunnels').read()); print(d['tunnels'][0]['public_url'] if d.get('tunnels') else 'NO_TUNNEL')\""
    )
    url = r.result.strip() if r.result else ""
    print(f"  ngrok URL: {url}")

    if url and url != "NO_TUNNEL":
        print(f"\n{'='*60}")
        print(f"  ngrok URL:     {url}")
        print(f"  Control UI:    {url}/chat?session=main")
        print(f"{'='*60}")
        sb.process.exec(f"bash -c 'echo {url} > /home/daytona/.winclaw/ngrok-url.txt'")
    else:
        print("  WARNING: Could not get ngrok URL")
        r = sb.process.exec("bash -c 'tail -20 /home/daytona/.winclaw/ngrok.log 2>/dev/null || echo NO_LOG'")
        print(f"  ngrok log:\n{r.result}")

if __name__ == "__main__":
    main()
