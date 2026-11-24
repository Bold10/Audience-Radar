# Iteration 5: Researcher mode rename, per-post X pricing/validation, sample AI labels, privacy of run payloads
import os
import uuid

import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ALL = ["x", "telegram", "reddit", "youtube"]
CRYPTO = "a portfolio tracker for crypto traders"
CREATED = []  # run ids created here (written to /tmp for cleanup by id)


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    yield sess
    with open("/tmp/iter5_run_ids.txt", "a") as f:
        for rid in CREATED:
            f.write(rid + "\n")


def _body(**kw):
    b = {"client_id": "TEST_i5" + uuid.uuid4().hex[:8], "description": CRYPTO, "mode": "launch",
         "audience": {"name": "TEST_Day traders", "description": "Active traders", "signals": []},
         "sources": ALL, "x_posts": 50}
    b.update(kw)
    return b


def _create(s, **kw):
    r = s.post(f"{BASE}/api/runs", json=_body(**kw), timeout=30)
    if r.status_code == 200:
        CREATED.append(r.json()["id"])
    return r


# --- config ---
def test_config_pricing_ai_payment(s):
    d = s.get(f"{BASE}/api/config", timeout=20).json()
    p = d["pricing"]
    assert p["price_per_post"] == 0.01 and p["min_posts"] == 50 and p["step"] == 50
    assert p["max_posts"] == 100 and p["include_author_metrics"] is False
    assert d["ai"]["enabled"] is False and d["payment_mode"] == "mock"
    assert d["max_text"] == 1000
    txt = str(d).lower()
    for bad in ("secret", "bearer", "api_key", "mongo", "sk_"):
        assert bad not in txt, bad


# --- quote ---
@pytest.mark.parametrize("n,total", [(50, 0.5), (100, 1.0)])
def test_quote_ok(s, n, total):
    r = s.post(f"{BASE}/api/quote", json={"sources": ALL, "x_posts": n}, timeout=20)
    assert r.status_code == 200 and r.json()["total"] == total
    x = [l for l in r.json()["lines"] if l["source"] == "x"][0]
    assert x["sample_size"] == n and x["unit_price"] == 0.01


def test_quote_150_rejected(s):
    r = s.post(f"{BASE}/api/quote", json={"sources": ALL, "x_posts": 150}, timeout=20)
    assert r.status_code == 422 and r.json()["detail"] == "You can search up to 100 X posts per run."


@pytest.mark.parametrize("n", [75, 0, 25, -50])
def test_quote_bad_steps(s, n):
    assert s.post(f"{BASE}/api/quote", json={"sources": ALL, "x_posts": n}, timeout=20).status_code == 422


def test_quote_free_only(s):
    r = s.post(f"{BASE}/api/quote", json={"sources": ["telegram", "reddit", "youtube"], "x_posts": 50}, timeout=20)
    assert r.status_code == 200 and r.json()["total"] == 0


# --- run validation ---
def test_creator_mode_rejected(s):
    assert _create(s, mode="creator", role="Writer").status_code == 422


def test_desc_1001_rejected_1000_ok(s):
    assert _create(s, description="a" * 1001).status_code == 422
    assert _create(s, description="a" * 1000).status_code == 200


def test_role_too_long(s):
    assert _create(s, mode="researcher", role="r" * 41).status_code == 422


def test_run_x_posts_150_rejected(s):
    r = _create(s, x_posts=150)
    assert r.status_code == 422 and "100" in r.json()["detail"]


# --- researcher flow ---
def test_researcher_sales_rep_flow(s):
    r = _create(s, mode="researcher", role="Sales rep", x_posts=50)
    assert r.status_code == 200, r.text
    run = r.json()
    for k in ("x_api_cost_usd", "user_id"):
        assert k not in run
    assert run["cost"]["total"] == 0.5
    p = s.post(f"{BASE}/api/runs/{run['id']}/pay", json={"asset": "USDC"}, timeout=60)
    assert p.status_code == 200
    d = p.json()
    for k in ("x_api_cost_usd", "client_id", "user_id"):
        assert k not in d
    res = d["results"]
    assert res["ranking_source"] == "sample"
    rk = res["researcher_ranking"]
    assert len(rk) >= 2 and all(i.get("show_up") and i.get("reason") and i.get("label") for i in rk)
    x = [r for r in res["sources"] if r["id"] == "x"][0]
    assert x["sample_size"] == 50 and x["fallback"] == "No X key set" and x["label"] == "High"
    assert len(res["keywords"]) == 8
    g = s.get(f"{BASE}/api/runs/{run['id']}", timeout=20).json()
    for k in ("x_api_cost_usd", "client_id", "user_id", "share_token"):
        assert k not in g
    assert g["mode"] == "researcher" and g["role"] == "Sales rep"


def test_launch_100_posts(s):
    r = _create(s, x_posts=100)
    assert r.status_code == 200 and r.json()["cost"]["total"] == 1.0
    d = s.post(f"{BASE}/api/runs/{r.json()['id']}/pay", json={"asset": "USDC"}, timeout=60).json()
    x = [r for r in d["results"]["sources"] if r["id"] == "x"][0]
    assert x["sample_size"] == 100 and x["label"] == "High"
    assert "researcher_ranking" not in d["results"]
    assert len(d["results"]["keywords"]) == 8
    # kit + share regression
    k = s.post(f"{BASE}/api/runs/{d['id']}/kit", timeout=60)
    assert k.status_code == 200 and k.json()["source"] == "sample" and k.json()["x_post"]
    cid = [b for b in [r.request.body] if b][0]
    import json as _j
    client_id = _j.loads(cid)["client_id"]
    sh = s.post(f"{BASE}/api/runs/{d['id']}/share", json={"client_id": client_id}, timeout=60)
    assert sh.status_code == 200 and sh.json()["token"]
    pub = s.get(f"{BASE}/api/shared/{sh.json()['token']}", timeout=20)
    assert pub.status_code == 200
    pj = pub.json()
    assert pj["kit"]["source"] == "sample" and "client_id" not in pj and "x_api_cost_usd" not in pj
    # non-owner cannot manage share
    assert s.delete(f"{BASE}/api/runs/{d['id']}/share", params={"client_id": "TEST_other1"}, timeout=20).status_code == 403
    assert s.delete(f"{BASE}/api/runs/{d['id']}/share", params={"client_id": client_id}, timeout=20).status_code == 200
    assert s.get(f"{BASE}/api/shared/{sh.json()['token']}", timeout=20).status_code == 404


def test_free_only_run_no_x(s):
    r = _create(s, sources=["telegram", "reddit"], x_posts=150)  # x_posts ignored without X
    assert r.status_code == 200 and r.json()["cost"]["total"] == 0


def test_audiences_desc_limit(s):
    r = s.post(f"{BASE}/api/audiences", json={"description": "b" * 1001, "mode": "researcher", "role": "Writer"}, timeout=20)
    assert r.status_code == 422
    r = s.post(f"{BASE}/api/audiences", json={"description": "dog training tips", "mode": "researcher", "role": "Writer"}, timeout=20)
    assert r.status_code == 200 and r.json()["source"] == "sample" and len(r.json()["options"]) == 3
