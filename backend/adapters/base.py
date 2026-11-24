import json
import os
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path

from settings import load_settings

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_data"


class SourceAdapter(ABC):
    """Shared interface for every data source. Items: id, author_followers, engagement, days_ago, text."""
    id: str
    name: str
    paid: bool
    unit: str

    @abstractmethod
    async def fetch(self, query: str, audience: str, limit: int | None = None) -> list[dict]:
        ...

    @abstractmethod
    def sample_size(self) -> int:
        ...

    def meta(self) -> dict:
        return {"id": self.id, "name": self.name, "paid": self.paid, "unit": self.unit,
                "sample_size": self.sample_size(), "live": self.live}


class DemoAdapter(SourceAdapter):
    """Reads bundled JSON sample files; `limit` takes the first N items."""
    live = False

    def _items(self) -> list[dict]:
        return json.loads((SAMPLE_DIR / f"{self.id}.json").read_text())["items"]

    async def fetch(self, query: str, audience: str, limit: int | None = None) -> list[dict]:
        items = self._items()
        return items[:limit] if limit else items

    def sample_size(self) -> int:
        return len(self._items())


class LiveAdapter(SourceAdapter):
    """Official-API adapter (no scraping). Active only when all credentials_env vars are set."""
    live = True
    credentials_env: tuple[str, ...] = ()
    sample_key: str = ""

    def configured(self) -> bool:
        return bool(self.credentials_env) and all(os.environ.get(k) for k in self.credentials_env)

    def sample_size(self) -> int:
        return load_settings()["live"][self.sample_key]

    async def fetch(self, query: str, audience: str, limit: int | None = None) -> list[dict]:
        raise NotImplementedError(f"Live {self.name} adapter is not available yet.")


STOP = {"a", "an", "the", "for", "of", "to", "and", "or", "in", "on", "with", "my", "our", "your", "app", "tool", "that", "who", "is", "by"}


def search_terms(description: str, n: int = 3) -> str:
    words = [w for w in re.findall(r"[a-zA-Z0-9]+", description.lower()) if w not in STOP and len(w) > 1]
    return " ".join(words[:n]) or description


def days_ago(ts: datetime) -> int:
    return max(0, (datetime.now(timezone.utc) - ts).days)


def parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))
