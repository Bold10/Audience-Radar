from .base import DemoAdapter, LiveAdapter


class _YouTubeMeta:
    id, name, paid, unit = "youtube", "YouTube", False, "videos"


class YouTubeDemoAdapter(_YouTubeMeta, DemoAdapter):
    pass


class YouTubeLiveAdapter(_YouTubeMeta, LiveAdapter):
    """Official YouTube Data API v3 goes here."""
