"""Payment adapters. Only PAYMENT_MODE=mock exists; a Solana USDC adapter can plug in here later."""
import os
import secrets
from datetime import datetime, timezone


class MockPayment:
    mode = "mock"

    async def charge(self, run: dict, asset: str) -> dict:
        return {"mock": True, "asset": asset, "amount": run["cost"]["total"],
                "tx_hash": "0x" + secrets.token_hex(32), "paid_at": datetime.now(timezone.utc).isoformat()}


ADAPTERS = {"mock": MockPayment}


def payment_mode() -> str:
    return os.environ.get("PAYMENT_MODE") or "mock"


def get_payment_adapter():
    mode = payment_mode()
    if mode not in ADAPTERS:
        raise RuntimeError(f"PAYMENT_MODE={mode} is not supported; only 'mock' is available")
    return ADAPTERS[mode]()
