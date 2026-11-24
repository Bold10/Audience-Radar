# helper (not a test): create a paid TEST_ launch run for UI checks; prints client_id and run id
import os, sys, uuid, requests
B = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
cid = sys.argv[1] if len(sys.argv) > 1 else "TEST_ui" + uuid.uuid4().hex[:8]
mode = sys.argv[2] if len(sys.argv) > 2 else "launch"
body = {"client_id": cid, "description": "a portfolio tracker for crypto traders", "mode": mode,
        "audience": {"name": "Day traders", "description": "Active traders", "signals": []}, "sources": ["x", "telegram", "reddit", "youtube"]}
if mode == "researcher":
    body["role"] = "Writer"
r = requests.post(f"{B}/api/runs", json=body, timeout=30).json()
requests.post(f"{B}/api/runs/{r['id']}/pay", json={"asset": "USDC"}, timeout=120)
print(cid, r["id"])
