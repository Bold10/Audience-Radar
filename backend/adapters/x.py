import os

import httpx

from settings import load_settings

from .base import DemoAdapter, LiveAdapter, days_ago, parse_iso, search_terms

SEARCH_URL = "https://api.x.com/2/tweets/search/recent"


class _XMeta:
    id, name, paid, unit = "x", "X", True, "posts"


class XDemoAdapter(_XMeta, DemoAdapter):
    pass


class XLiveAdapter(_XMeta, LiveAdapter):
    """Official X API v2 recent search (last 7 days)."""
    credentials_env = ("X_BEARER_TOKEN",)
    sample_key = "x_max_posts"

    async def fetch(self, query: str, audience: str) -> list[dict]:
        limit = load_settings()["live"]["x_max_posts"]
        params = {"query": f"{search_terms(query)} -is:retweet -is:reply lang:en", "max_results": min(100, max(10, limit)),
                  "tweet.fields": "created_at,public_metrics,author_id", "expansions": "author_id",
                  "user.fields": "public_metrics"}
        headers = {"Authorization": f"Bearer {os.environ['X_BEARER_TOKEN']}"}
        items: list[dict] = []
        async with httpx.AsyncClient(timeout=20) as client:
            while len(items) < limit:
                r = await client.get(SEARCH_URL, params=params, headers=headers)
                r.raise_for_status()
                data = r.json()
                users = {u["id"]: u["public_metrics"]["followers_count"] for u in data.get("includes", {}).get("users", [])}
                for t in data.get("data", []):
                    m = t["public_metrics"]
                    items.append({"id": t["id"], "author_followers": users.get(t["author_id"], 0),
                                  "engagement": m["like_count"] + m["retweet_count"] + m["reply_count"] + m.get("quote_count", 0),
                                  "days_ago": days_ago(parse_iso(t["created_at"])), "text": t["text"]})
                token = data.get("meta", {}).get("next_token")
                if not token:
                    break
                params["next_token"] = token
        return items[:limit]
