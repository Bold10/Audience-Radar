from .base import DemoAdapter, LiveAdapter


class _RedditMeta:
    id, name, paid, unit = "reddit", "Reddit", False, "posts"


class RedditDemoAdapter(_RedditMeta, DemoAdapter):
    pass


class RedditLiveAdapter(_RedditMeta, LiveAdapter):
    """Official Reddit Data API goes here."""
