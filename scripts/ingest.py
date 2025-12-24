import json
import os
import sys
import requests

WORKER_URL = os.environ.get("WORKER_URL")  # e.g. https://edge-rag-helpdesk.username.workers.dev
INGEST_TOKEN = os.environ.get("INGEST_TOKEN")

if not WORKER_URL or not INGEST_TOKEN:
    print("Set WORKER_URL and INGEST_TOKEN env vars.")
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/ingest.py path/to/file.txt [tenant] [source]")
        sys.exit(1)

    path = sys.argv[1]
    tenant = sys.argv[2] if len(sys.argv) > 2 else "public"
    source = sys.argv[3] if len(sys.argv) > 3 else path

    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    payload = {
        "documents": [{
            "text": text,
            "tenant": tenant,
            "source": source,
            "tags": ["demo"]
        }]
    }

    r = requests.post(
        f"{WORKER_URL}/api/ingest",
        headers={
            "Authorization": f"Bearer {INGEST_TOKEN}",
            "Content-Type": "application/json"
        },
        data=json.dumps(payload)
    )
    print(r.status_code)
    print(r.text)

if __name__ == "__main__":
    main()
