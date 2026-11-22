import json
from abc import ABC, abstractmethod
from pathlib import Path

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_data"


class SourceAdapter(ABC):
    """Shared interface for every data source. Items: id, author_followers, engagement, days_ago, text."""
    id: str
    name: str
    paid: bool
    unit: str

    @abstractmethod
    async def fetch(self, query: str, audience: str) -> list[dict]:
        ...

    @abstractmethod
    def sample_size(self) -> int:
        ...

    def meta(self) -> dict:
        return {"id": self.id, "name": self.name, "paid": self.paid, "unit": self.unit,
                "sample_size": self.sample_size()}


class DemoAdapter(SourceAdapter):
    """Reads bundled JSON sample files."""

    def _items(self) -> list[dict]:
        return json.loads((SAMPLE_DIR / f"{self.id}.json").read_text())["items"]

    async def fetch(self, query: str, audience: str) -> list[dict]:
        return self._items()

    def sample_size(self) -> int:
        return len(self._items())


class LiveAdapter(SourceAdapter):
    """Placeholder for official-API adapters (no scraping). Implement fetch() per platform."""

    async def fetch(self, query: str, audience: str) -> list[dict]:
        raise NotImplementedError(f"Live {self.name} adapter is not configured yet (official API only).")

    def sample_size(self) -> int:
        return 0
