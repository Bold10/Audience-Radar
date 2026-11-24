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
from adapters.x import include_author_metrics  # noqa: E402
from model_layer import ai_available, call_model, model_config  # noqa: E402
from model_layer import init as init_model_layer  # noqa: E402
from payments import get_payment_adapter, payment_mode  # noqa: E402
from scoring import hot_keywords, interest  # noqa: E402
from settings import load_settings  # noqa: E402

try:  # launched as `backend.server` (the default)
    from backend.clerk_auth import clerk_router, require_user, verify_session_token
except ModuleNotFoundError:  # launched from inside backend/ as `server`
    from clerk_auth import clerk_router, require_user, verify_session_token

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
FALLBACKS = json.loads((ROOT_DIR / "sample_data" / "ai_fallbacks.json").read_text())
SAMPLE_NICHE = "a portfolio tracker for crypto traders"


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
        acct = {"user_id": user_id, "email": email,
                "created_at": datetime.now(timezone.utc).isoformat()}
        await db.users.update_one({"user_id": user_id}, {"$setOnInsert": acct}, upsert=True)
    return acct


async def optional_account(request: Request) -> Optional[dict]:
    """Signed-in account, or None when signed out."""
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
    "ai_cache": [IndexModel([("hash", ASCENDING)], name="hash", unique=True),
                 IndexModel([("created_at", ASCENDING)], name="ttl", expireAfterSeconds=86400)],
    "ai_usage": [IndexModel([("key", ASCENDING), ("day", ASCENDING)], name="key_day", unique=True)],
    "x_usage": [IndexModel([("day", ASCENDING)], name="day", unique=True)],
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
Mode = Literal["launch", "researcher"]
MAX_TEXT = 1000


def is_researcher(run: dict) -> bool:
    return run["mode"] in ("researcher", "creator")  # "creator" = runs saved before the rename


class AudienceIn(BaseModel):
    client_id: Optional[str] = Field(default=None, max_length=64)
    description: str = Field(min_length=3, max_length=MAX_TEXT)
    mode: Mode
    role: Optional[str] = Field(default=None, max_length=40)
    exclude: List[str] = Field(default_factory=list, max_length=30)
    round: int = 0


class Audience(BaseModel):
    name: str = Field(max_length=80)
    description: str = Field(max_length=400)
    signals: List[str] = Field(default_factory=list, max_length=6)


class RunIn(BaseModel):
    client_id: str = Field(min_length=6, max_length=64)
    description: str = Field(min_length=3, max_length=MAX_TEXT)
    mode: Mode
    role: Optional[str] = Field(default=None, max_length=40)
    audience: Audience
    sources: List[SourceId] = Field(min_length=1)
    x_posts: int = 50


class QuoteIn(BaseModel):
    sources: List[SourceId] = Field(min_length=1)
    x_posts: int = 50


class PayIn(BaseModel):
    asset: str = "USDC"


def _env_num(name: str, default: float) -> float:
    return float(os.environ.get(name) or default)


def pricing() -> dict:
    s = load_settings()["pricing"]
    return {"price_per_post": _env_num("PRICE_PER_POST_USD", 0.01), "include_author_metrics": include_author_metrics(),
            "author_cost_per_post": _env_num("X_COST_PER_AUTHOR_USD", 0.01),
            "min_posts": 50, "step": 50, "default_posts": 50, "max_posts": int(_env_num("MAX_POSTS_PER_RUN", 100)),
            "currency": s["currency"], "crypto_assets": s["crypto_assets"]}


def requester_key(request: Request, client_id: Optional[str]) -> str:
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip()
    return f"{client_id or 'anon'}|{ip}"


def is_sample(desc: str) -> bool:
    d = desc.lower()
    return "portfolio tracker" in d and "crypto" in d


def check_posts(x_posts: int, p: dict) -> None:
    if x_posts > p["max_posts"]:
        raise HTTPException(422, f"You can search up to {p['max_posts']} X posts per run.")
    if x_posts < p["min_posts"] or x_posts % p["step"]:
        raise HTTPException(422, f"Choose {p['min_posts']} to {p['max_posts']} X posts, in steps of {p['step']}.")


def quote(sources: list[str], x_posts: int) -> dict:
    p = pricing()
    if "x" in sources:
        check_posts(x_posts, p)
    adapters = get_adapters()
    lines = []
    for sid in sources:
        a = adapters[sid]
        size = x_posts if sid == "x" else a.sample_size()
        price = p["price_per_post"] if a.paid else 0.0
        lines.append({"source": sid, "name": a.name, "paid": a.paid, "sample_size": size, "unit": a.unit,
                      "unit_price": price, "cost": round(size * price, 4)})
        if sid == "x" and p["include_author_metrics"]:
            lines.append({"source": "x_authors", "name": "X author data", "paid": True, "sample_size": size, "unit": "posts",
                          "unit_price": p["author_cost_per_post"], "cost": round(size * p["author_cost_per_post"], 4)})
    return {"lines": lines, "total": round(sum(line["cost"] for line in lines), 2), "currency": p["currency"]}


async def reserve_x_posts(n: int) -> bool:
    """App-wide daily X post cap (UTC day)."""
    cap, day = int(_env_num("DAILY_X_POST_CAP", 500)), datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.x_usage.update_one({"day": day}, {"$setOnInsert": {"posts": 0}}, upsert=True)
    res = await db.x_usage.update_one({"day": day, "posts": {"$lte": cap - n}}, {"$inc": {"posts": n}})
    return res.modified_count == 1


async def release_x_posts(n: int) -> None:
    await db.x_usage.update_one({"day": datetime.now(timezone.utc).strftime("%Y-%m-%d")}, {"$inc": {"posts": -n}})


async def get_run(run_id: str) -> dict:
    run = await db.runs.find_one({"id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, "Run not found")
    return run


X_FALLBACK_REASONS = {"missing_key": "No X key set", "credits": "X credits used up",
                      "daily_cap": "Daily X limit reached", "error": "X request failed"}


async def fetch_source(sid: str, a, run: dict) -> tuple[object, list[dict], Optional[str]]:
    """Returns (adapter used, items, fallback reason). Any live problem falls back to sample data."""
    limit = run.get("x_posts", 50) if sid == "x" else None
    reason = "missing_key" if sid == "x" and not a.live else None
    if a.live and sid == "x" and not await reserve_x_posts(limit):
        reason = "daily_cap"
    elif a.live:
        try:
            return a, await a.fetch(run["description"], run["audience"]["name"], limit), None
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            logging.getLogger(__name__).warning("Live %s fetch failed (%s), using sample data", sid, status or type(exc).__name__)
            reason = "credits" if status in (402, 429) else "error"
            if sid == "x":
                await release_x_posts(limit)
    demo = demo_adapters()[sid]
    return demo, await demo.fetch(run["description"], run["audience"]["name"], limit), reason if sid == "x" else None


async def compute_results(run: dict, requester: str) -> dict:
    s = load_settings()
    adapters = get_adapters()
    rows, groups = [], []
    for sid in run["sources"]:
        a, items, reason = await fetch_source(sid, adapters[sid], run)
        scale = 1.0 if a.live else len(items) / max(a.sample_size(), 1)
        groups.append(items)
        rows.append({"id": sid, "name": a.name, "paid": a.paid, "unit": a.unit, "live": a.live,
                     "fallback": X_FALLBACK_REASONS.get(reason) if reason else None,
                     **interest(sid, items, s["interest"], a.live, scale)})
    results = {"sources": sorted(rows, key=lambda r: r["score"], reverse=True), "keywords": hot_keywords(groups, s["keywords"])}
    if is_researcher(run):
        role = run.get("role") or "Other"
        by_id = {r["id"]: r for r in rows}
        ranked, source = await call_model("researcher_ranking", {
            "niche": run["description"], "role": role,
            "audience": {"name": run["audience"]["name"], "description": run["audience"]["description"]},
            "platforms": [{"platform": r["id"], "interest": r["label"], "sample_size": r["sample_size"], "unit": r["unit"]}
                          for r in rows]}, requester)
        fallback = FALLBACKS["researcher_ranking"]
        items = (ranked or {}).get("items") or sorted(
            fallback.get(role, fallback["Other"]), key=lambda it: -by_id.get(it["platform"], {"score": -1})["score"])
        results["ranking_source"] = source if ranked else "sample"
        results["researcher_ranking"] = [
            {**it, "name": by_id[it["platform"]]["name"], "label": by_id[it["platform"]]["label"],
             "sample_size": by_id[it["platform"]]["sample_size"], "unit": by_id[it["platform"]]["unit"],
             "live": by_id[it["platform"]]["live"]}
            for it in items if it["platform"] in by_id]
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
    return {"demo_mode": not all(m["live"] for m in sources), "data_mode": data_mode(), "pricing": pricing(),
            "thresholds": s["interest"]["thresholds"], "sources": sources, "payment_mode": payment_mode(),
            "ai": {"enabled": ai_available(), "provider": cfg["provider"], "model": cfg["model"], "daily_limit": cfg["daily_limit"]},
            "max_text": MAX_TEXT, "sample_niche": SAMPLE_NICHE}


@api.post("/audiences")
async def audiences(body: AudienceIn, request: Request):
    sets = FALLBACKS["audience_sets"]
    if body.round == 0 and is_sample(body.description):
        return {"options": sets[0], "source": "sample"}
    result, source = await call_model("audience_options", body.model_dump(include={"description", "mode", "role", "exclude"}),
                                      requester_key(request, body.client_id))
    if result:
        return {"options": result["options"], "source": source}
    return {"options": sets[body.round % len(sets)], "source": "sample"}


@api.post("/quote")
async def get_quote(body: QuoteIn):
    return quote(body.sources, body.x_posts)


@api.post("/runs")
async def create_run(body: RunIn, acct: Optional[dict] = Depends(optional_account)):
    cost = quote(body.sources, body.x_posts)
    x_api_cost = body.x_posts * (_env_num("X_COST_PER_POST_USD", 0.005)
                                 + (_env_num("X_COST_PER_AUTHOR_USD", 0.01) if include_author_metrics() else 0))
    run = {**body.model_dump(), "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat(),
           "status": "pending_payment", "cost": cost, "demo": not all(get_adapters()[s].live for s in body.sources),
           "payment": None, "results": None, "kit": None, "user_id": acct["user_id"] if acct else None,
           "x_api_cost_usd": round(x_api_cost, 4) if "x" in body.sources else 0.0}
    await db.runs.insert_one(dict(run))
    for k in ("user_id", "x_api_cost_usd"):
        run.pop(k)
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
    return {"email": acct["email"]}


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
    for k in ("client_id", "user_id", "share_token", "x_api_cost_usd"):
        run.pop(k, None)
    return run


@api.post("/runs/{run_id}/pay")
async def pay_run(run_id: str, body: PayIn, request: Request):
    run = await get_run(run_id)
    if run["status"] == "paid":
        return await read_run(run_id)
    payment = await get_payment_adapter().charge(run, body.asset)
    results = await compute_results(run, requester_key(request, run.get("client_id")))
    await db.runs.update_one({"id": run_id, "status": "pending_payment"},
                             {"$set": {"status": "paid", "payment": payment, "results": results}})
    return await read_run(run_id)


@api.post("/runs/{run_id}/kit")
async def launch_kit(run_id: str, request: Request):
    run = await get_run(run_id)
    if run["status"] != "paid":
        raise HTTPException(402, "Run is not paid yet")
    if run.get("kit"):
        return {**run["kit"], "demo": run["results"].get("demo", True)}
    res = run["results"]
    kit, source = await call_model("launch_kit", {
        "product_or_niche": run["description"], "mode": run["mode"], "role": run.get("role"),
        "audience": {"name": run["audience"]["name"], "description": run["audience"]["description"]},
        "hot_keywords": res["keywords"],
        "best_sources": [{"source": r["name"], "interest": r["label"], "sample_size": r["sample_size"]} for r in res["sources"]]},
        requester_key(request, run.get("client_id")))
    kit = {**(kit or FALLBACKS["launch_kit"]), "source": source if kit else "sample", "keywords": res["keywords"]}
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
async def create_share(run_id: str, body: ClaimIn, request: Request, acct: Optional[dict] = Depends(optional_account)):
    run = await owned_paid_run(run_id, acct, body.client_id)
    if run.get("share_token"):
        return {"token": run["share_token"]}
    await launch_kit(run_id, request)
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
    init_model_layer(db)
    get_payment_adapter()  # fail fast on an unsupported PAYMENT_MODE
    app.state.index_task = asyncio.create_task(ensure_indexes())


@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
