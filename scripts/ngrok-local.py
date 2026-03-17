"""Start ngrok tunnel for local GRC server (port 3100) using Python SDK."""
import ngrok
import time
import signal
import sys

DOMAIN = "postarterial-holstered-beata.ngrok-free.dev"

def main():
    print(f"Starting ngrok tunnel → http://localhost:3100")
    print(f"Domain: {DOMAIN}")

    listener = ngrok.forward(
        3100,
        authtoken="33mnxdKV65DPliNxPvjvDIjuriU_7smrcN113vKCsY94tTXuk",
        domain=DOMAIN,
    )

    url = listener.url()
    print(f"\n{'='*50}")
    print(f" ngrok tunnel active!")
    print(f" URL: {url}")
    print(f"{'='*50}\n")
    print("Press Ctrl+C to stop...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down ngrok...")
        ngrok.disconnect(url)
        print("Done.")

if __name__ == "__main__":
    main()
