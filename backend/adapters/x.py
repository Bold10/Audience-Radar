from .base import DemoAdapter, LiveAdapter


class _XMeta:
    id, name, paid, unit = "x", "X", True, "posts"


class XDemoAdapter(_XMeta, DemoAdapter):
    pass


class XLiveAdapter(_XMeta, LiveAdapter):
    """Official X API v2 recent search goes here."""
