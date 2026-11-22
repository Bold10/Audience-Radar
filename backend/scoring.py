import re
from collections import Counter
from statistics import median

STOPWORDS = {"the", "and", "for", "with", "this", "that", "you", "your", "are", "was", "new", "today", "week",
             "check", "update", "buy", "sell", "just", "from", "have", "has", "but", "not", "all", "out"}
TOKEN = re.compile(r"#?[a-z0-9]+")


def label_for(score: float, thresholds: dict) -> str:
    if score >= thresholds["high"]:
        return "High"
    if score >= thresholds["medium"]:
        return "Medium"
    return "Low"


def interest(source_id: str, items: list[dict], cfg: dict) -> dict:
    target = cfg["targets"][source_id]
    w = cfg["weights"]
    recent = sum(1 for i in items if i["days_ago"] < cfg["volume_window_days"])
    med = median(i["engagement"] for i in items) if items else 0
    vol_score = min(100.0, 100.0 * recent / target["volume"])
    eng_score = min(100.0, 100.0 * med / target["engagement"])
    score = round(w["volume"] * vol_score + w["engagement"] * eng_score, 1)
    return {"score": score, "label": label_for(score, cfg["thresholds"]), "sample_size": len(items),
            "recent_count": recent, "median_engagement": med}


def _tokens(text: str) -> set[str]:
    return {t for t in TOKEN.findall(text.lower()) if len(t) >= 3 and t not in STOPWORDS}


def keyword_candidates(items: list[dict], cfg: dict) -> list[str]:
    """Words/hashtags most over-represented in the top performers (engagement relative to followers)."""
    if not items:
        return []
    ranked = sorted(items, key=lambda i: i["engagement"] / max(i["author_followers"], 1), reverse=True)
    cut = max(1, int(len(ranked) * cfg["top_fraction"]))
    top, rest = ranked[:cut], ranked[cut:]
    top_df = Counter(t for i in top for t in _tokens(i["text"]))
    rest_df = Counter(t for i in rest for t in _tokens(i["text"]))
    lift = {t: ((c + 1) / (len(top) + 2)) / ((rest_df[t] + 1) / (len(rest) + 2))
            for t, c in top_df.items() if c >= cfg["min_top_count"]}
    return [t for t, _ in sorted(lift.items(), key=lambda kv: kv[1], reverse=True)][: cfg["candidate_pool"]]
