import os

from .base import SourceAdapter
from .reddit import RedditDemoAdapter, RedditLiveAdapter
from .telegram import TelegramDemoAdapter, TelegramLiveAdapter
from .x import XDemoAdapter, XLiveAdapter
from .youtube import YouTubeDemoAdapter, YouTubeLiveAdapter

_SOURCES = [
    (XDemoAdapter, XLiveAdapter),
    (TelegramDemoAdapter, TelegramLiveAdapter),
    (RedditDemoAdapter, RedditLiveAdapter),
    (YouTubeDemoAdapter, YouTubeLiveAdapter),
]


def data_mode() -> str:
    """'demo' forces sample data; 'auto' uses a live adapter wherever its credentials are set."""
    return os.environ["DATA_MODE"]


def demo_adapters() -> dict[str, SourceAdapter]:
    return {d.id: d() for d, _ in _SOURCES}


def get_adapters() -> dict[str, SourceAdapter]:
    out = {}
    for demo_cls, live_cls in _SOURCES:
        live = live_cls()
        out[demo_cls.id] = live if data_mode() != "demo" and live.configured() else demo_cls()
    return out
