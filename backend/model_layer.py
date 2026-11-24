import asyncio
import hashlib
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from google import genai
from google.genai import types

from schemas import TASK_SCHEMAS

PROMPTS_DIR = Path(__file__).parent / "prompts"
CACHE_TTL = timedelta(hours=24)
logger = logging.getLogger("model_layer")
_state: dict = {"db": None, "client": None, "key": None}


def init(db) -> None:
    _state["db"] = db


def model_config() -> dict:
    return {"provider": "gemini", "model": os.environ.get("GEMINI_MODEL") or "gemini-flash-latest",
            "daily_limit": int(os.environ.get("AI_DAILY_LIMIT_PER_BROWSER") or 20)}


def ai_available() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


def _load_prompt(task: str, payload: dict) -> tuple[str, str]:
    system, user = (PROMPTS_DIR / f"{task}.txt").read_text().split("---USER---")
    return system.strip(), user.strip().replace("{{input}}", json.dumps(payload, ensure_ascii=False))


def _gemini_client() -> genai.Client:
    key = os.environ["GEMINI_API_KEY"]
    if _state["key"] != key:
        _state["client"], _state["key"] = genai.Client(api_key=key), key
    return _state["client"]


async def _call_gemini(task: str, system: str, user: str) -> dict:
    resp = await _gemini_client().aio.models.generate_content(
        model=model_config()["model"], contents=user,
        config=types.GenerateContentConfig(system_instruction=system, temperature=0.4,
                                           response_mime_type="application/json"))
    return TASK_SCHEMAS[task].model_validate_json(resp.text).model_dump()


PROVIDERS = {"gemini": _call_gemini}  # add another provider here and select it in model_config()


async def _take_quota(requester: str) -> bool:
    db, day = _state["db"], datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.ai_usage.update_one({"key": requester, "day": day}, {"$setOnInsert": {"count": 0}}, upsert=True)
    res = await db.ai_usage.update_one({"key": requester, "day": day, "count": {"$lt": model_config()["daily_limit"]}},
                                       {"$inc": {"count": 1}})
    return res.modified_count == 1


async def call_model(task: str, payload: dict, requester: str) -> tuple[dict | None, str]:
    """Single entry point for every AI step. Returns (validated JSON, "ai") or (None, "sample")."""
    if not ai_available():
        return None, "sample"
    db, cfg = _state["db"], model_config()
    digest = hashlib.sha256(json.dumps([task, cfg["model"], payload], sort_keys=True).encode()).hexdigest()
    now = datetime.now(timezone.utc)
    cached = await db.ai_cache.find_one({"hash": digest, "created_at": {"$gt": now - CACHE_TTL}}, {"_id": 0, "data": 1})
    if cached:
        return cached["data"], "ai"
    if not await _take_quota(requester):
        logger.info("call_model(%s): daily AI limit reached, using sample", task)
        return None, "sample"
    system, user = _load_prompt(task, payload)
    try:
        data = await asyncio.wait_for(PROVIDERS[cfg["provider"]](task, system, user), timeout=60)
    except Exception as exc:
        logger.warning("call_model(%s) failed (%s), using sample", task, type(exc).__name__)
        return None, "sample"
    await db.ai_cache.update_one({"hash": digest}, {"$set": {"data": data, "created_at": now}}, upsert=True)
    return data, "ai"
