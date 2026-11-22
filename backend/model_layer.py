import asyncio
import json
import logging
import os
import uuid
from pathlib import Path

from emergentintegrations.llm.chat import LlmChat, UserMessage

from schemas import TASK_SCHEMAS

PROMPTS_DIR = Path(__file__).parent / "prompts"
logger = logging.getLogger("model_layer")


def model_config() -> dict:
    return {
        "enabled": os.environ.get("AI_ENABLED", "true").lower() == "true",
        "provider": os.environ["MODEL_PROVIDER"],
        "model": os.environ["MODEL_NAME"],
    }


def _api_key() -> str | None:
    return os.environ.get("MODEL_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")


def ai_available() -> bool:
    return model_config()["enabled"] and bool(_api_key())


def _load_prompt(task: str, payload: dict) -> tuple[str, str]:
    system, user = (PROMPTS_DIR / f"{task}.txt").read_text().split("---USER---")
    return system.strip(), user.strip().replace("{{input}}", json.dumps(payload, ensure_ascii=False))


def _extract_json(text: str) -> dict:
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1])


async def call_model(task: str, payload: dict) -> dict | None:
    """Single entry point for every AI step. Returns validated JSON or None (caller falls back to samples)."""
    if not ai_available():
        return None
    cfg = model_config()
    system, user = _load_prompt(task, payload)
    try:
        chat = LlmChat(api_key=_api_key(), session_id=f"{task}-{uuid.uuid4()}", system_message=system)
        chat = chat.with_model(cfg["provider"], cfg["model"])
        text = await asyncio.wait_for(chat.send_message(UserMessage(text=user)), timeout=60)
        return TASK_SCHEMAS[task].model_validate(_extract_json(text)).model_dump()
    except Exception as exc:
        logger.warning("call_model(%s) failed, using sample fallback: %s", task, exc)
        return None
