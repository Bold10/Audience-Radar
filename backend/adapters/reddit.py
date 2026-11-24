import os
from datetime import datetime, timezone

import httpx

from settings import load_settings

from .base import DemoAdapter, LiveAdapter, days_ago, search_terms


class _RedditMeta:
    id, name, paid, unit = "reddit", "Reddit", False, "posts"


class RedditDemoAdapter(_RedditMeta, DemoAdapter):
    pass


class RedditLiveAdapter(_RedditMeta, LiveAdapter):
    """Official Reddit Data API, app-only OAuth (client credentials)."""
    credentials_env = ("REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USER_AGENT")
    sample_key = "reddit_max_posts"

    async def fetch(self, query: str, audience: str, limit: int | None = None) -> list[dict]:
        limit = min(100, load_settings()["live"]["reddit_max_posts"])
        ua = {"User-Agent": os.environ["REDDIT_USER_AGENT"]}
        async with httpx.AsyncClient(timeout=20) as client:
            tok = await client.post("https://www.reddit.com/api/v1/access_token", data={"grant_type": "client_credentials"},
                                    auth=(os.environ["REDDIT_CLIENT_ID"], os.environ["REDDIT_CLIENT_SECRET"]), headers=ua)
            tok.raise_for_status()
            r = await client.get("https://oauth.reddit.com/search",
                                 params={"q": search_terms(query), "sort": "new", "t": "month", "limit": limit, "type": "link"},
                                 headers={**ua, "Authorization": f"Bearer {tok.json()['access_token']}"})
            r.raise_for_status()
        return [{"id": p["id"], "author_followers": p.get("subreddit_subscribers") or 0,
                 "engagement": p.get("score", 0) + p.get("num_comments", 0),
                 "days_ago": days_ago(datetime.fromtimestamp(p["created_utc"], timezone.utc)),
                 "text": f"{p.get('title', '')} {p.get('selftext', '')[:500]}"}
                for p in (c["data"] for c in r.json()["data"]["children"])]
