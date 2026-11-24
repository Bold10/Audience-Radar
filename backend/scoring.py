import re
from collections import Counter
from statistics import median

STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "you", "your", "are", "was", "new", "today", "week", "check",
    "update", "buy", "sell", "just", "from", "have", "has", "but", "not", "all", "out", "about", "what", "when",
    "where", "which", "who", "why", "how", "can", "will", "would", "could", "should", "been", "being", "were",
    "they", "them", "their", "there", "here", "then", "than", "into", "over", "under", "more", "most", "some",
    "any", "very", "also", "only", "our", "ours", "its", "it's", "his", "her", "she", "him", "one", "two", "get",
    "got", "like", "make", "made", "does", "did", "doing", "dont", "don", "isn", "aren", "now", "use", "using",
    "via", "amp", "https", "http", "www", "com", "these", "those", "other", "such", "each", "every", "much",
    "many", "own", "same", "too", "off", "again", "once", "yes", "let", "lets", "see", "way", "really",
}
TOKEN = re.compile(r"#?[a-z0-9]+")
URL = re.compile(r"https?://\S+")


def label_for(score: float, thresholds: dict) -> str:
    if score >= thresholds["high"]:
        return "High"
    if score >= thresholds["medium"]:
        return "Medium"
    return "Low"


def interest(source_id: str, items: list[dict], cfg: dict, live: bool = False, volume_scale: float = 1.0) -> dict:
    """Demo: volume = posts inside the window (target scaled to the sampled share). Live: posts per day across the sample."""
    target = cfg["live_targets" if live else "targets"][source_id]
    w = cfg["weights"]
    recent = sum(1 for i in items if i["days_ago"] < cfg["volume_window_days"])
    if live:
        span = max((i["days_ago"] for i in items), default=0) + 1
        volume = len(items) / span
    else:
        volume = recent / max(volume_scale, 1e-9)
    med = median(i["engagement"] for i in items) if items else 0
    vol_score = min(100.0, 100.0 * volume / target["volume"])
    eng_score = min(100.0, 100.0 * med / target["engagement"])
    score = round(w["volume"] * vol_score + w["engagement"] * eng_score, 1)
    return {"score": score, "label": label_for(score, cfg["thresholds"]), "sample_size": len(items),
            "recent_count": recent, "median_engagement": med}


def _tokens(text: str) -> set[str]:
    return {t for t in TOKEN.findall(URL.sub(" ", text.lower())) if len(t) >= 3 and t not in STOPWORDS}


def _perf(item: dict) -> float:
    """Engagement relative to followers when author data exists, raw engagement otherwise."""
    followers = item.get("author_followers")
    return item["engagement"] / max(followers, 1) if followers is not None else item["engagement"]


def hot_keywords(groups: list[list[dict]], cfg: dict) -> list[str]:
    """Words/hashtags most over-represented in each source's top performers. Returns keywords only, never text."""
    top, rest = [], []
    for items in groups:
        ranked = sorted(items, key=_perf, reverse=True)
        cut = max(1, int(len(ranked) * cfg["top_fraction"])) if ranked else 0
        top += ranked[:cut]
        rest += ranked[cut:]
    if not top:
        return []
    top_df = Counter(t for i in top for t in _tokens(i["text"]))
    rest_df = Counter(t for i in rest for t in _tokens(i["text"]))
    lift = {t: ((c + 1) / (len(top) + 2)) / ((rest_df[t] + 1) / (len(rest) + 2))
            for t, c in top_df.items() if c >= cfg["min_top_count"]}
    return [t for t, _ in sorted(lift.items(), key=lambda kv: kv[1], reverse=True)][: cfg["count"]]
