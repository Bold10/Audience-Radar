import os
from datetime import datetime, timedelta, timezone

import httpx

from settings import load_settings

from .base import DemoAdapter, LiveAdapter, days_ago, parse_iso, search_terms

API = "https://www.googleapis.com/youtube/v3"


class _YouTubeMeta:
    id, name, paid, unit = "youtube", "YouTube", False, "videos"


class YouTubeDemoAdapter(_YouTubeMeta, DemoAdapter):
    pass


class YouTubeLiveAdapter(_YouTubeMeta, LiveAdapter):
    """Official YouTube Data API v3 (search + videos + channels)."""
    credentials_env = ("YOUTUBE_API_KEY",)
    sample_key = "youtube_max_videos"

    async def fetch(self, query: str, audience: str, limit: int | None = None) -> list[dict]:
        key = os.environ["YOUTUBE_API_KEY"]
        limit = min(50, load_settings()["live"]["youtube_max_videos"])
        after = (datetime.now(timezone.utc) - timedelta(days=60)).strftime("%Y-%m-%dT%H:%M:%SZ")
        async with httpx.AsyncClient(timeout=20) as client:
            s = await client.get(f"{API}/search", params={"part": "snippet", "q": search_terms(query), "type": "video",
                                                          "order": "relevance", "publishedAfter": after,
                                                          "maxResults": limit, "key": key})
            s.raise_for_status()
            ids = [i["id"]["videoId"] for i in s.json().get("items", [])]
            if not ids:
                return []
            v = await client.get(f"{API}/videos", params={"part": "snippet,statistics", "id": ",".join(ids), "key": key})
            v.raise_for_status()
            videos = v.json().get("items", [])
            ch_ids = list({x["snippet"]["channelId"] for x in videos})
            c = await client.get(f"{API}/channels", params={"part": "statistics", "id": ",".join(ch_ids), "key": key})
            c.raise_for_status()
        subs = {x["id"]: int(x["statistics"].get("subscriberCount", 0)) for x in c.json().get("items", [])}
        return [{"id": x["id"], "author_followers": subs.get(x["snippet"]["channelId"], 0),
                 "engagement": int(x["statistics"].get("likeCount", 0)) + int(x["statistics"].get("commentCount", 0)),
                 "days_ago": days_ago(parse_iso(x["snippet"]["publishedAt"])),
                 "text": f"{x['snippet']['title']} {x['snippet'].get('description', '')[:300]} {' '.join(x['snippet'].get('tags', [])[:10])}"}
                for x in videos]
