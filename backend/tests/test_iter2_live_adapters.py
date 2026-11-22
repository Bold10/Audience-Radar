# Iteration 2: DATA_MODE=auto with no live keys -> all sources sample/Demo; live adapter unit checks (fallback, configured())
import os
import sys
import uuid
import asyncio
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
CLIENT = "TEST_" + uuid.uuid4().hex[:10]
AUD = {"name": "Day traders", "description": "Active traders", "signals": []}
ALL = ["x", "telegram", "reddit", "youtube"]
SAMPLE = "a portfolio tracker for crypto traders"
CREATED = []


@pytest.fixture(scope="module")
def s():
    yield requests.Session()
    from dotenv import load_dotenv
    from pymongo import MongoClient
    load_dotenv("/app/backend/.env")
    if CREATED:
        MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]].runs.delete_many({"id": {"$in": CREATED}})


# Config: auto mode, all demo
def test_config_auto_all_demo(s):
    d = s.get(f"{BASE_URL}/api/config").json()
    assert d["data_mode"] == "auto"
    assert d["demo_mode"] is True
    assert all(x["live"] is False for x in d["sources"])
    sizes = {x["id"]: x["sample_size"] for x in d["sources"]}
    assert sizes["x"] == 500


def test_quote_total_250(s):
    r = s.post(f"{BASE_URL}/api/runs", json={"client_id": CLIENT, "description": SAMPLE, "mode": "launch",
                                             "audience": AUD, "sources": ALL})
    assert r.status_code == 200
    CREATED.append(r.json()["id"])
    assert r.json()["cost"]["total"] == 2.5
    assert r.json()["demo"] is True


# Full run regression: results demo, live false, labels, kit demo
def test_full_run_demo_flags(s):
    r = s.post(f"{BASE_URL}/api/runs", json={"client_id": CLIENT, "description": SAMPLE, "mode": "launch",
                                             "audience": AUD, "sources": ALL})
    rid = r.json()["id"]
    CREATED.append(rid)
    p = s.post(f"{BASE_URL}/api/runs/{rid}/pay", json={"asset": "USDC"}, timeout=120)
    assert p.status_code == 200, p.text
    res = p.json()["results"]
    assert res["demo"] is True
    assert all(x["live"] is False for x in res["sources"])
    assert {x["id"]: x["label"] for x in res["sources"]} == {"x": "High", "telegram": "Medium", "reddit": "Low", "youtube": "Medium"}
    g = s.get(f"{BASE_URL}/api/runs/{rid}").json()
    assert g["results"]["demo"] is True
    k = s.post(f"{BASE_URL}/api/runs/{rid}/kit", timeout=120)
    assert k.status_code == 200
    assert k.json()["demo"] is True


def test_creator_ranking_live_flag(s):
    r = s.post(f"{BASE_URL}/api/runs", json={"client_id": CLIENT, "description": "crypto trading education",
                                             "mode": "creator", "role": "Video creator", "audience": AUD, "sources": ALL})
    rid = r.json()["id"]
    CREATED.append(rid)
    p = s.post(f"{BASE_URL}/api/runs/{rid}/pay", json={"asset": "ETH"}, timeout=120)
    assert p.status_code == 200
    cr = p.json()["results"]["creator_ranking"]
    assert cr and all(it["live"] is False for it in cr)


# Unit: adapter selection + fallback on bad live keys (in-process, no network keys)
def _import_backend():
    sys.path.insert(0, "/app/backend")
    import adapters
    return adapters


def test_unit_selection_auto_vs_demo(monkeypatch):
    ad = _import_backend()
    monkeypatch.setenv("DATA_MODE", "auto")
    for k in ["X_BEARER_TOKEN", "REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "YOUTUBE_API_KEY"]:
        monkeypatch.delenv(k, raising=False)
    assert all(not a.live for a in ad.get_adapters().values())
    monkeypatch.setenv("X_BEARER_TOKEN", "fake")
    a = ad.get_adapters()
    assert a["x"].live and a["x"].sample_size() == 100
    assert not a["reddit"].live and not a["telegram"].live
    monkeypatch.setenv("DATA_MODE", "demo")
    assert not ad.get_adapters()["x"].live


def test_unit_live_x_bad_token_raises(monkeypatch):
    ad = _import_backend()
    monkeypatch.setenv("X_BEARER_TOKEN", "fake-token")
    from adapters.x import XLiveAdapter
    with pytest.raises(Exception):
        asyncio.run(XLiveAdapter().fetch(SAMPLE, "Day traders"))


def test_unit_scoring_empty_live():
    _import_backend()
    from scoring import interest
    from settings import load_settings
    r = interest("youtube", [], load_settings()["interest"], live=True)
    assert r["sample_size"] == 0 and r["label"] == "Low"
