# Iteration 4: share links (owner/paid checks, public shared view, stop/re-share) and Clerk Gmail-only auth (me, claim, scopes)
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
SK = os.environ["CLERK_SECRET_KEY"]
CH = {"Authorization": f"Bearer {SK}", "User-Agent": "audience-radar-tests"}
CLERK = "https://api.clerk.com/v1"
GMAIL = "radar.tester+clerk_test@gmail.com"
OTHER = "radar.other+clerk_test@example.com"
AUD = {"name": "Day traders", "description": "Active traders", "signals": []}
CREATED = []


def clerk_user_id(email):
    r = requests.get(f"{CLERK}/users", params={"email_address": email}, headers=CH, timeout=15)
    r.raise_for_status()
    users = r.json()
    if not users:
        pytest.skip(f"Clerk user {email} missing")
    return users[0]["id"]


def session_token(email):
    uid = clerk_user_id(email)
    s = requests.post(f"{CLERK}/sessions", json={"user_id": uid}, headers=CH, timeout=15)
    s.raise_for_status()
    t = requests.post(f"{CLERK}/sessions/{s.json()['id']}/tokens", json={"expires_in_seconds": 3600}, headers=CH, timeout=15)
    t.raise_for_status()
    return t.json()["jwt"]


@pytest.fixture(scope="module")
def tokens():
    return {"gmail": session_token(GMAIL), "other": session_token(OTHER)}


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    from pymongo import MongoClient
    if CREATED:
        MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]].runs.delete_many({"id": {"$in": CREATED}})


def make_run(client_id, headers=None, pay=True):
    r = requests.post(f"{BASE_URL}/api/runs", headers=headers or {}, json={
        "client_id": client_id, "description": "a portfolio tracker for crypto traders", "mode": "launch",
        "audience": AUD, "sources": ["telegram", "reddit"]}, timeout=30)
    assert r.status_code == 200, r.text
    rid = r.json()["id"]
    CREATED.append(rid)
    if pay:
        p = requests.post(f"{BASE_URL}/api/runs/{rid}/pay", json={"asset": "USDC"}, timeout=120)
        assert p.status_code == 200 and p.json()["status"] == "paid"
    return rid


# Share: browser-owned run
def test_share_flow_browser_owner():
    cid = "TEST_" + uuid.uuid4().hex[:10]
    rid = make_run(cid)
    st = requests.get(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": cid}).json()
    assert st == {"owner": True, "token": None}
    assert requests.get(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": "TEST_other1"}).json()["owner"] is False
    # non-owner create/delete -> 403
    assert requests.post(f"{BASE_URL}/api/runs/{rid}/share", json={"client_id": "TEST_other1"}).status_code == 403
    assert requests.delete(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": "TEST_other1"}).status_code == 403
    r = requests.post(f"{BASE_URL}/api/runs/{rid}/share", json={"client_id": cid}, timeout=120)
    assert r.status_code == 200
    tok = r.json()["token"]
    assert isinstance(tok, str) and len(tok) >= 20
    # idempotent
    assert requests.post(f"{BASE_URL}/api/runs/{rid}/share", json={"client_id": cid}, timeout=60).json()["token"] == tok
    sh = requests.get(f"{BASE_URL}/api/shared/{tok}")
    assert sh.status_code == 200
    d = sh.json()
    for k in ("payment", "client_id", "user_id", "id", "share_token", "cost", "status"):
        assert k not in d, k
    assert d["kit"] and d["kit"].get("keywords") and "demo" in d["kit"]
    assert d["results"]["sources"] and d["results"]["keywords"]
    # owner GET returns token, non-owner never does
    assert requests.get(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": cid}).json()["token"] == tok
    assert requests.get(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": "TEST_x"}).json()["token"] is None
    # read_run must not leak share_token
    assert "share_token" not in requests.get(f"{BASE_URL}/api/runs/{rid}").json()
    # stop
    assert requests.delete(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": cid}).json() == {"token": None}
    assert requests.get(f"{BASE_URL}/api/shared/{tok}").status_code == 404
    tok2 = requests.post(f"{BASE_URL}/api/runs/{rid}/share", json={"client_id": cid}, timeout=60).json()["token"]
    assert tok2 and tok2 != tok
    assert requests.get(f"{BASE_URL}/api/shared/{tok2}").status_code == 200
    assert requests.get(f"{BASE_URL}/api/shared/{tok}").status_code == 404


def test_share_unpaid_402_and_404():
    cid = "TEST_" + uuid.uuid4().hex[:10]
    rid = make_run(cid, pay=False)
    assert requests.post(f"{BASE_URL}/api/runs/{rid}/share", json={"client_id": cid}).status_code == 402
    assert requests.post(f"{BASE_URL}/api/runs/nope-{uuid.uuid4()}/share", json={"client_id": cid}).status_code == 404
    assert requests.get(f"{BASE_URL}/api/shared/doesnotexist123").status_code == 404


# Auth
def test_me_no_token_401():
    assert requests.get(f"{BASE_URL}/api/me").status_code == 401
    assert requests.get(f"{BASE_URL}/api/me", headers=H("garbage")).status_code == 401


def test_me_gmail(tokens):
    r = requests.get(f"{BASE_URL}/api/me", headers=H(tokens["gmail"]))
    assert r.status_code == 200
    assert r.json() == {"email": GMAIL, "gmail": True, "message": None}


def test_non_gmail_refused(tokens):
    r = requests.get(f"{BASE_URL}/api/me", headers=H(tokens["other"]))
    assert r.status_code == 200
    assert r.json()["gmail"] is False and r.json()["message"]
    h = H(tokens["other"])
    assert requests.get(f"{BASE_URL}/api/runs", params={"scope": "mine"}, headers=h).status_code == 403
    assert requests.post(f"{BASE_URL}/api/me/claim", json={"client_id": "TEST_abcdef"}, headers=h).status_code == 403
    r = requests.post(f"{BASE_URL}/api/runs", headers=h, json={
        "client_id": "TEST_abcdef", "description": "x tool", "mode": "launch", "audience": AUD, "sources": ["reddit"]})
    assert r.status_code == 403


def test_claim_and_scopes(tokens):
    cid = "TEST_" + uuid.uuid4().hex[:10]
    rid = make_run(cid)
    mine = requests.get(f"{BASE_URL}/api/runs", params={"scope": "mine", "client_id": cid}).json()
    assert [x["id"] for x in mine] == [rid]
    assert requests.post(f"{BASE_URL}/api/me/claim", json={"client_id": cid}).status_code == 401
    c = requests.post(f"{BASE_URL}/api/me/claim", json={"client_id": cid}, headers=H(tokens["gmail"]))
    assert c.status_code == 200 and c.json()["claimed"] == 1
    # browser-only My runs no longer sees it
    assert requests.get(f"{BASE_URL}/api/runs", params={"scope": "mine", "client_id": cid}).json() == []
    acc = requests.get(f"{BASE_URL}/api/runs", params={"scope": "mine", "limit": 200}, headers=H(tokens["gmail"])).json()
    assert rid in [x["id"] for x in acc]
    # account run: browser client_id no longer owns it
    st = requests.get(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": cid}).json()
    assert st["owner"] is False
    assert requests.post(f"{BASE_URL}/api/runs/{rid}/share", json={"client_id": cid}).status_code == 403
    assert requests.post(f"{BASE_URL}/api/runs/{rid}/share", json={"client_id": "TEST_zzzzzz"}).status_code == 403
    # account owner can share with any client_id
    r = requests.post(f"{BASE_URL}/api/runs/{rid}/share", json={"client_id": "TEST_zzzzzz"}, headers=H(tokens["gmail"]), timeout=120)
    assert r.status_code == 200 and r.json()["token"]
    assert requests.get(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": "TEST_zzzzzz"},
                        headers=H(tokens["gmail"])).json()["owner"] is True
    assert requests.delete(f"{BASE_URL}/api/runs/{rid}/share", params={"client_id": "x"}, headers=H(tokens["gmail"])).status_code == 200


def test_signed_in_run_creation_saved_to_account(tokens):
    cid = "TEST_" + uuid.uuid4().hex[:10]
    rid = make_run(cid, headers=H(tokens["gmail"]), pay=False)
    assert requests.get(f"{BASE_URL}/api/runs", params={"scope": "mine", "client_id": cid}).json() == []
    acc = requests.get(f"{BASE_URL}/api/runs", params={"scope": "mine", "limit": 200}, headers=H(tokens["gmail"])).json()
    assert rid in [x["id"] for x in acc]
