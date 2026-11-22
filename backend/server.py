import asyncio
import json
import logging
import os
import secrets
import uuid
from contextlib import suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from adapters import data_mode, demo_adapters, get_adapters  # noqa: E402
from model_layer import ai_available, call_model, model_config  # noqa: E402
from scoring import interest, keyword_candidates  # noqa: E402
from settings import load_settings  # noqa: E402

try:  # launched as `backend.server` (the default)
    from backend.clerk_auth import clerk_router, require_user, verify_session_token
except ModuleNotFoundError:  # launched from inside backend/ as `server`
    from clerk_auth import clerk_router, require_user, verify_session_token

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
FALLBACKS = json.loads((ROOT_DIR / "sample_data" / "ai_fallbacks.json").read_text())
SAMPLE_NICHE = "a portfolio tracker for crypto traders"
GMAIL_DOMAINS = {"gmail.com", "googlemail.com"}
GMAIL_ONLY = "Only Gmail addresses (@gmail.com or @googlemail.com) are supported for now."


def _clerk_email(user_id: str) -> str:
    r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                     headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "audience-radar"})
    r.raise_for_status()
    data = r.json()
    emails = {e["id"]: e["email_address"] for e in data.get("email_addresses", [])}
    return (emails.get(data.get("primary_email_address_id")) or next(iter(emails.values()), "")).lower()


async def account_for(user_id: str) -> dict:
    acct = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if acct is None:
        email = await run_in_threadpool(_clerk_email, user_id)
        acct = {"user_id": user_id, "email": email, "gmail": email.rsplit("@", 1)[-1] in GMAIL_DOMAINS,
                "created_at": datetime.now(timezone.utc).isoformat()}
        await db.users.update_one({"user_id": user_id}, {"$setOnInsert": acct}, upsert=True)
    return acct


async def optional_account(request: Request) -> Optional[dict]:
    """Signed-in Gmail account, None when signed out; 403 for non-Gmail accounts."""
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    try:
        claims = verify_session_token(auth[7:])
    except HTTPException:
        return None  # stale token on a public endpoint: treat as signed out
    try:
        acct = await account_for(claims["sub"])
    except requests.RequestException:
        raise HTTPException(503, "Sign-in service is unavailable, try again shortly")
    if not acct["gmail"]:
        raise HTTPException(403, GMAIL_ONLY)
    return acct


def is_owner(run: dict, acct: Optional[dict], client_id: Optional[str]) -> bool:
    if run.get("user_id"):
        return bool(acct) and acct["user_id"] == run["user_id"]
    return bool(client_id) and client_id == run.get("client_id")

INDEXES: dict[str, list[IndexModel]] = {
    "runs": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("client_id", ASCENDING), ("created_at", DESCENDING)], name="client_created"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created"),
        IndexModel([("share_token", ASCENDING)], name="share_token", unique=True,
                   partialFilterExpression={"share_token": {"$type": "string"}}),
    ],
    "users": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logging.getLogger(__name__).error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


app = FastAPI()
api = APIRouter(prefix="/api")
SourceId = Literal["x", "telegram", "reddit", "youtube"]
Mode = Literal["launch", "creator"]


class AudienceIn(BaseModel):
    description: str = Field(min_length=3, max_length=500)
    mode: Mode
    role: Optional[str] = None
    exclude: List[str] = Field(default_factory=list)
    round: int = 0


class Audience(BaseModel):
    name: str
    description: str
    signals: List[str] = Field(default_factory=list)


class RunIn(BaseModel):
    client_id: str = Field(min_length=6, max_length=64)
    description: str = Field(min_length=3, max_length=500)
    mode: Mode
    role: Optional[str] = None
    audience: Audience
    sources: List[SourceId] = Field(min_length=1)


class PayIn(BaseModel):
    asset: str = "USDC"


def is_sample(desc: str) -> bool:
    d = desc.lower()
    return "portfolio tracker" in d and "crypto" in d


def quote(sources: list[str]) -> dict:
    s = load_settings()
    price = s["pricing"]["x_price_per_post"]
    adapters = get_adapters()
    lines = []
    for sid in sources:
        a = adapters[sid]
        size = a.sample_size()
        cost = round(size * price, 4) if a.paid else 0.0
        lines.append({"source": sid, "name": a.name, "paid": a.paid, "sample_size": size, "unit": a.unit,
                      "unit_price": price if a.paid else 0.0, "cost": cost})
    return {"lines": lines, "total": round(sum(line["cost"] for line in lines), 2), "currency": s["pricing"]["currency"]}


async def get_run(run_id: str) -> dict:
    run = await db.runs.find_one({"id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, "Run not found")
    return run


async def compute_results(run: dict) -> dict:
    s = load_settings()
    adapters = get_adapters()
    rows, all_items = [], []
    for sid in run["sources"]:
        a = adapters[sid]
        live = a.live
        try:
            items = await a.fetch(run["description"], run["audience"]["name"])
        except Exception as exc:
            logging.getLogger(__name__).warning("Live %s fetch failed, using sample data: %s", sid, exc)
            a, live = demo_adapters()[sid], False
            items = await a.fetch(run["description"], run["audience"]["name"])
        all_items += items
        rows.append({"id": sid, "name": a.name, "paid": a.paid, "unit": a.unit, "live": live,
                     **interest(sid, items, s["interest"], live)})
    count = s["keywords"]["count"]
    candidates = keyword_candidates(all_items, s["keywords"])
    creator = run["mode"] == "creator"
    picked, ranked = await asyncio.gather(
        call_model("keyword_extraction", {"niche": run["description"], "audience": run["audience"]["name"],
                                          "candidates": candidates}),
        call_model("creator_ranking", {
            "niche": run["description"], "role": run.get("role"), "audience": run["audience"],
            "platforms": [{"platform": r["id"], "interest": r["label"], "sample_size": r["sample_size"]} for r in rows]})
        if creator else asyncio.sleep(0),
    )
    keywords = [k for k in (picked or {}).get("keywords", []) if k in candidates][:count]
    ai_used = bool(keywords)
    keywords += [c for c in candidates if c not in keywords][: count - len(keywords)]
    results = {"sources": sorted(rows, key=lambda r: r["score"], reverse=True), "keywords": keywords}
    if creator:
        by_id = {r["id"]: r for r in rows}
        items = (ranked or {}).get("items") or FALLBACKS["creator_ranking"]
        ai_used = ai_used or bool(ranked)
        results["creator_ranking"] = [
            {**it, "name": by_id[it["platform"]]["name"], "label": by_id[it["platform"]]["label"],
             "sample_size": by_id[it["platform"]]["sample_size"], "unit": by_id[it["platform"]]["unit"],
             "live": by_id[it["platform"]]["live"]}
            for it in items if it["platform"] in by_id]
    results["ai_used"] = ai_used
    results["demo"] = not all(r["live"] for r in rows)
    return results


@api.get("/")
async def root():
    return {"message": "Audience Radar API"}


@api.get("/config")
async def get_config():
    s = load_settings()
    cfg = model_config()
    sources = [a.meta() for a in get_adapters().values()]
    return {"demo_mode": not all(m["live"] for m in sources), "data_mode": data_mode(), "pricing": s["pricing"],
            "thresholds": s["interest"]["thresholds"], "sources": sources,
            "ai": {"enabled": ai_available(), "provider": cfg["provider"], "model": cfg["model"]},
            "sample_niche": SAMPLE_NICHE}


@api.post("/audiences")
async def audiences(body: AudienceIn):
    sets = FALLBACKS["audience_sets"]
    if body.round == 0 and is_sample(body.description):
        return {"options": sets[0], "source": "sample"}
    result = await call_model("audience_options", body.model_dump(include={"description", "mode", "role", "exclude"}))
    if result:
        return {"options": result["options"], "source": "ai"}
    return {"options": sets[body.round % len(sets)], "source": "sample"}


@api.post("/quote")
async def get_quote(sources: List[SourceId]):
    return quote(sources)


@api.post("/runs")
async def create_run(body: RunIn, acct: Optional[dict] = Depends(optional_account)):
    run = {**body.model_dump(), "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat(),
           "status": "pending_payment", "cost": quote(body.sources), "demo": not all(get_adapters()[s].live for s in body.sources),
           "payment": None, "results": None, "kit": None, "user_id": acct["user_id"] if acct else None}
    await db.runs.insert_one(dict(run))
    run.pop("user_id")
    return run


@api.get("/runs")
async def list_runs(scope: Literal["mine", "all"] = "mine", client_id: Optional[str] = None,
                    limit: int = Query(50, ge=1, le=200), acct: Optional[dict] = Depends(optional_account)):
    if scope == "all":
        q = {}
    elif acct:
        q = {"user_id": acct["user_id"]}
    elif client_id:
        q = {"client_id": client_id, "user_id": None}
    else:
        return []
    proj = {"_id": 0, "id": 1, "created_at": 1, "description": 1, "mode": 1, "role": 1, "cost.total": 1,
            "status": 1, "audience.name": 1, "demo": 1}
    return await db.runs.find(q, proj).sort("created_at", -1).limit(limit).to_list(limit)


@api.get("/me")
async def me(user: dict = Depends(require_user)):
    acct = await account_for(user["user_id"])
    return {"email": acct["email"], "gmail": acct["gmail"], "message": None if acct["gmail"] else GMAIL_ONLY}


class ClaimIn(BaseModel):
    client_id: str = Field(min_length=6, max_length=64)


@api.post("/me/claim")
async def claim_runs(body: ClaimIn, acct: Optional[dict] = Depends(optional_account)):
    if not acct:
        raise HTTPException(401, "Not signed in")
    res = await db.runs.update_many({"client_id": body.client_id, "user_id": None}, {"$set": {"user_id": acct["user_id"]}})
    return {"claimed": res.modified_count}


@api.get("/runs/{run_id}")
async def read_run(run_id: str):
    run = await get_run(run_id)
    for k in ("client_id", "user_id", "share_token"):
        run.pop(k, None)
    return run


@api.post("/runs/{run_id}/pay")
async def pay_run(run_id: str, body: PayIn):
    run = await get_run(run_id)
    if run["status"] == "paid":
        return run
    payment = {"mock": True, "asset": body.asset, "amount": run["cost"]["total"],
               "tx_hash": "0x" + secrets.token_hex(32), "paid_at": datetime.now(timezone.utc).isoformat()}
    results = await compute_results(run)
    await db.runs.update_one({"id": run_id, "status": "pending_payment"},
                             {"$set": {"status": "paid", "payment": payment, "results": results}})
    return await read_run(run_id)


@api.post("/runs/{run_id}/kit")
async def launch_kit(run_id: str):
    run = await get_run(run_id)
    if run["status"] != "paid":
        raise HTTPException(402, "Run is not paid yet")
    if run.get("kit"):
        return {**run["kit"], "demo": run["results"].get("demo", True)}
    res = run["results"]
    kit = await call_model("launch_kit", {
        "product_or_niche": run["description"], "mode": run["mode"], "role": run.get("role"),
        "audience": run["audience"], "hot_keywords": res["keywords"],
        "best_sources": [{"source": r["name"], "interest": r["label"]} for r in res["sources"]]})
    kit = {**(kit or FALLBACKS["launch_kit"]), "source": "ai" if kit else "sample", "keywords": res["keywords"]}
    await db.runs.update_one({"id": run_id, "kit": None}, {"$set": {"kit": kit}})
    return {**(await get_run(run_id))["kit"], "demo": res.get("demo", True)}


async def owned_paid_run(run_id: str, acct: Optional[dict], client_id: Optional[str]) -> dict:
    run = await get_run(run_id)
    if not is_owner(run, acct, client_id):
        raise HTTPException(403, "Only the owner of this run can manage sharing")
    if run["status"] != "paid":
        raise HTTPException(402, "Unpaid runs cannot be shared")
    return run


@api.get("/runs/{run_id}/share")
async def share_status(run_id: str, client_id: Optional[str] = None, acct: Optional[dict] = Depends(optional_account)):
    run = await get_run(run_id)
    return {"owner": is_owner(run, acct, client_id), "token": run.get("share_token") if is_owner(run, acct, client_id) else None}


@api.post("/runs/{run_id}/share")
async def create_share(run_id: str, body: ClaimIn, acct: Optional[dict] = Depends(optional_account)):
    run = await owned_paid_run(run_id, acct, body.client_id)
    if run.get("share_token"):
        return {"token": run["share_token"]}
    await launch_kit(run_id)
    token = secrets.token_urlsafe(18)
    await db.runs.update_one({"id": run_id, "share_token": None}, {"$set": {"share_token": token}})
    return {"token": (await get_run(run_id))["share_token"]}


@api.delete("/runs/{run_id}/share")
async def stop_share(run_id: str, client_id: Optional[str] = None, acct: Optional[dict] = Depends(optional_account)):
    await owned_paid_run(run_id, acct, client_id)
    await db.runs.update_one({"id": run_id}, {"$set": {"share_token": None}})
    return {"token": None}


@api.get("/shared/{token}")
async def read_shared(token: str):
    run = await db.runs.find_one({"share_token": token}, {"_id": 0})
    if not run:
        raise HTTPException(404, "This shared link is not active")
    keep = ("description", "mode", "role", "audience", "created_at", "sources", "results")
    return {**{k: run.get(k) for k in keep}, "kit": {**run["kit"], "demo": run["results"].get("demo", True)}}


app.include_router(api)
app.include_router(clerk_router)  # /api/clerk/config and /api/__clerk/*
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@app.on_event("startup")
async def start_index_build():
    app.state.index_task = asyncio.create_task(ensure_indexes())


@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
