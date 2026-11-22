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

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from adapters import data_mode, demo_adapters, get_adapters  # noqa: E402
from model_layer import ai_available, call_model, model_config  # noqa: E402
from scoring import interest, keyword_candidates  # noqa: E402
from settings import load_settings  # noqa: E402

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
FALLBACKS = json.loads((ROOT_DIR / "sample_data" / "ai_fallbacks.json").read_text())
SAMPLE_NICHE = "a portfolio tracker for crypto traders"

INDEXES: dict[str, list[IndexModel]] = {
    "runs": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("client_id", ASCENDING), ("created_at", DESCENDING)], name="client_created"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
    ],
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
async def create_run(body: RunIn):
    run = {**body.model_dump(), "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat(),
           "status": "pending_payment", "cost": quote(body.sources), "demo": not all(get_adapters()[s].live for s in body.sources),
           "payment": None, "results": None, "kit": None}
    await db.runs.insert_one(dict(run))
    return run


@api.get("/runs")
async def list_runs(scope: Literal["mine", "all"] = "mine", client_id: Optional[str] = None,
                    limit: int = Query(50, ge=1, le=200)):
    q = {"client_id": client_id} if scope == "mine" else {}
    if scope == "mine" and not client_id:
        return []
    proj = {"_id": 0, "id": 1, "created_at": 1, "description": 1, "mode": 1, "role": 1, "cost.total": 1,
            "status": 1, "audience.name": 1, "demo": 1}
    return await db.runs.find(q, proj).sort("created_at", -1).limit(limit).to_list(limit)


@api.get("/runs/{run_id}")
async def read_run(run_id: str):
    run = await get_run(run_id)
    run.pop("client_id", None)
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


app.include_router(api)
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
