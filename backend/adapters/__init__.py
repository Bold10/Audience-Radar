import os

from .base import SourceAdapter
from .reddit import RedditDemoAdapter, RedditLiveAdapter
from .telegram import TelegramDemoAdapter, TelegramLiveAdapter
from .x import XDemoAdapter, XLiveAdapter
from .youtube import YouTubeDemoAdapter, YouTubeLiveAdapter

_REGISTRY = {
    "demo": [XDemoAdapter, TelegramDemoAdapter, RedditDemoAdapter, YouTubeDemoAdapter],
    "live": [XLiveAdapter, TelegramLiveAdapter, RedditLiveAdapter, YouTubeLiveAdapter],
}


def data_mode() -> str:
    return os.environ.get("DATA_MODE", "demo")


def get_adapters() -> dict[str, SourceAdapter]:
    return {a.id: a() for a in _REGISTRY[data_mode()]}
