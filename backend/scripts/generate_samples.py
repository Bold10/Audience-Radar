"""One-off generator for the bundled demo sample files. Re-run to regenerate sample_data/*.json."""
import json
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "sample_data"
BASE = ["crypto", "portfolio", "trading", "bitcoin", "eth", "market", "wallet", "price", "today", "week",
        "chart", "altcoins", "bags", "holding", "buy", "sell", "coins", "update", "new", "check"]
SIGNAL = {
    "x": ["#portfoliotracker", "pnl", "multiwallet", "taxreport", "rebalance", "pricealerts", "#cryptotrading",
          "realtime", "dashboard", "exchangesync"],
    "telegram": ["pnl", "signals", "pricealerts", "multiwallet", "realtime", "#portfoliotracker", "dashboard",
                 "exchangesync", "riskmanagement", "watchlist"],
    "reddit": ["taxreport", "spreadsheet", "rebalance", "costbasis", "multiwallet", "dca", "pnl", "privacy",
               "selfcustody", "#portfoliotracker"],
    "youtube": ["tutorial", "pnl", "dashboard", "setup", "#portfoliotracker", "beginners", "multiwallet",
                "taxreport", "review", "realtime"],
}
# size, share of items in the last 14 days, follower scale, base engagement rate
SPEC = {
    "x": (500, 0.62, 4000, 0.012),
    "telegram": (40, 0.55, 9000, 0.004),
    "reddit": (300, 0.18, 1500, 0.006),
    "youtube": (120, 0.45, 20000, 0.004),
}


def make(source, rng):
    size, recent_share, fscale, rate = SPEC[source]
    items = []
    top_n = int(size * 0.2)
    for i in range(size):
        followers = max(50, int(rng.lognormvariate(0, 0.9) * fscale))
        is_top = i < top_n
        r = rate * (rng.uniform(3, 6) if is_top else rng.uniform(0.4, 1.4))
        words = rng.sample(BASE, 6)
        sig = SIGNAL[source]
        words += rng.sample(sig[:8], 4) if is_top else rng.sample(sig, rng.choice([0, 0, 1]))
        rng.shuffle(words)
        items.append({
            "id": f"{source}-{i:04d}",
            "author_followers": followers,
            "engagement": int(followers * r),
            "days_ago": rng.randint(0, 13) if rng.random() < recent_share else rng.randint(14, 60),
            "text": " ".join(words),
        })
    rng.shuffle(items)
    return items


if __name__ == "__main__":
    rng = random.Random(42)
    OUT.mkdir(exist_ok=True)
    for src in SPEC:
        (OUT / f"{src}.json").write_text(json.dumps({"source": src, "items": make(src, rng)}))
        print("wrote", src)
