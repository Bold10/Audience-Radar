import json
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config" / "settings.json"


def load_settings() -> dict:
    return json.loads(CONFIG_PATH.read_text())
