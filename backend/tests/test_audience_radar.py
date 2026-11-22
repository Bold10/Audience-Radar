# Audience Radar API regression tests: config, audiences (AI), runs/cost, mock pay, results, kit, history
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
SAMPLE = "a portfolio tracker for crypto traders"
CLIENT = "TEST_" + uuid.uuid4().hex[:10]
AUD = {"name": "Day traders", "description": "Active traders", "signals": []}
ALL = ["x", "telegram", "reddit", "youtube"]


CREATED = []


@pytest.fixture(scope="module")
def s():
    yield requests.Session()
    # cleanup: no delete API exists, remove only the runs this module created, by id
    from dotenv import load_dotenv
    from pymongo import MongoClient
    load_dotenv("/app/backend/.env")
    if CREATED:
        MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]].runs.delete_many({"id": {"$in": CREATED}})


# Config
def test_config(s):
    r = s.get(f"{BASE_URL}/api/config")
    assert r.status_code == 200
    d = r.json()
    assert d["pricing"]["x_price_per_post"] == 0.005
    assert d["thresholds"] == {"high": 66, "medium": 33}
    sizes = {x["id"]: (x["sample_size"], x["paid"]) for x in d["sources"]}
    assert sizes == {"x": (500, True), "telegram": (40, False), "reddit": (300, False), "youtube": (120, False)}


# Audiences
def test_audiences_round0_sample(s):
    r = s.post(f"{BASE_URL}/api/audiences", json={"description": SAMPLE, "mode": "launch", "round": 0})
    assert r.status_code == 200
    names = [o["name"] for o in r.json()["options"]]
    assert names == ["Day traders", "Long-term holders", "NFT collectors"]


def test_audiences_round1_refine(s):
    ex = ["Day traders", "Long-term holders", "NFT collectors"]
    r = s.post(f"{BASE_URL}/api/audiences", json={"description": SAMPLE, "mode": "launch", "round": 1, "exclude": ex},
               timeout=90)
    assert r.status_code == 200
    d = r.json()
    print("refine source:", d["source"], [o["name"] for o in d["options"]])
    assert len(d["options"]) == 3
    assert not set(o["name"] for o in d["options"]) & set(ex)


def test_audiences_validation(s):
    r = s.post(f"{BASE_URL}/api/audiences", json={"description": "a", "mode": "launch"})
    assert r.status_code == 422


# Runs cost
def _run(s, sources, mode="launch", role=None, desc=SAMPLE):
    r = s.post(f"{BASE_URL}/api/runs", json={"client_id": CLIENT, "description": desc, "mode": mode, "role": role,
                                             "audience": AUD, "sources": sources})
    assert r.status_code == 200, r.text
    CREATED.append(r.json()["id"])
    return r.json()


def test_run_cost_all(s):
    run = _run(s, ALL)
    assert run["cost"]["total"] == 2.5
    assert run["status"] == "pending_payment"
    assert "_id" not in run


def test_run_cost_free(s):
    assert _run(s, ["telegram", "reddit", "youtube"])["cost"]["total"] == 0


def test_run_empty_sources(s):
    r = s.post(f"{BASE_URL}/api/runs", json={"client_id": CLIENT, "description": SAMPLE, "mode": "launch",
                                             "audience": AUD, "sources": []})
    assert r.status_code == 422


def test_kit_before_pay_402(s):
    run = _run(s, ["telegram"])
    assert s.post(f"{BASE_URL}/api/runs/{run['id']}/kit").status_code == 402


def test_run_404(s):
    assert s.get(f"{BASE_URL}/api/runs/nope-{uuid.uuid4()}").status_code == 404


# Pay + results + kit (launch)
def test_pay_launch_and_kit(s):
    run = _run(s, ALL)
    r = s.post(f"{BASE_URL}/api/runs/{run['id']}/pay", json={"asset": "USDC"}, timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "paid"
    assert d["payment"]["mock"] is True and d["payment"]["amount"] == 2.5
    labels = {x["id"]: x["label"] for x in d["results"]["sources"]}
    assert labels == {"x": "High", "telegram": "Medium", "reddit": "Low", "youtube": "Medium"}
    sizes = {x["id"]: x["sample_size"] for x in d["results"]["sources"]}
    assert sizes == {"x": 500, "telegram": 40, "reddit": 300, "youtube": 120}
    assert len(d["results"]["keywords"]) == 8
    assert "creator_ranking" not in d["results"]
    print("ai_used:", d["results"]["ai_used"], d["results"]["keywords"])
    g = s.get(f"{BASE_URL}/api/runs/{run['id']}").json()
    assert g["status"] == "paid" and "client_id" not in g
    k = s.post(f"{BASE_URL}/api/runs/{run['id']}/kit", timeout=120)
    assert k.status_code == 200, k.text
    kit = k.json()
    for f in ["x_post", "telegram_message", "card_headline", "card_subline", "video_script"]:
        assert kit.get(f), f
    assert len(kit["video_script"]) >= 3
    print("kit source:", kit["source"])
    # idempotent kit
    assert s.post(f"{BASE_URL}/api/runs/{run['id']}/kit").json()["x_post"] == kit["x_post"]


# Creator mode
def test_pay_creator(s):
    run = _run(s, ALL, mode="creator", role="Video creator", desc="crypto trading education")
    r = s.post(f"{BASE_URL}/api/runs/{run['id']}/pay", json={"asset": "USDC"}, timeout=120)
    assert r.status_code == 200, r.text
    cr = r.json()["results"]["creator_ranking"]
    assert len(cr) >= 2
    for it in cr:
        assert it["label"] in ("High", "Medium", "Low") and it["reason"] and it["format"] and it["community"]


# History
def test_history(s):
    mine = s.get(f"{BASE_URL}/api/runs", params={"scope": "mine", "client_id": CLIENT}).json()
    assert len(mine) >= 4
    assert all("_id" not in x for x in mine)
    allr = s.get(f"{BASE_URL}/api/runs", params={"scope": "all"}).json()
    assert len(allr) >= len(mine)
    assert s.get(f"{BASE_URL}/api/runs", params={"scope": "mine"}).json() == []
    other = s.get(f"{BASE_URL}/api/runs", params={"scope": "mine", "client_id": "TEST_other_xyz"}).json()
    assert other == []
