from .base import DemoAdapter, LiveAdapter


class _TelegramMeta:
    id, name, paid, unit = "telegram", "Telegram", False, "channels"


class TelegramDemoAdapter(_TelegramMeta, DemoAdapter):
    pass


class TelegramLiveAdapter(_TelegramMeta, LiveAdapter):
    """Official Telegram API (MTProto) not connected yet; stays on sample data (no credentials_env)."""
