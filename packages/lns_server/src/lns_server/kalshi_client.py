"""Kalshi market data + authenticated order client (RSA-PSS)."""

from __future__ import annotations

import base64
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from lns_server.settings import Settings


class KalshiError(RuntimeError):
    pass


def _cents_to_prob(v: Any) -> float | None:
    if v is None:
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    if x > 1.0:
        x = x / 100.0
    return max(0.0, min(1.0, x))


def _prob_to_cents(p: float) -> int:
    return max(1, min(99, int(round(p * 100))))


@dataclass
class MarketQuote:
    ticker: str
    title: str
    event_ticker: str | None
    status: str | None
    yes_bid: float | None
    yes_ask: float | None
    last_price: float | None
    yes_mid: float | None
    close_time: str | None
    floor_strike: float | None
    raw: dict[str, Any]

    def as_public_dict(self) -> dict[str, Any]:
        return {
            "ticker": self.ticker,
            "title": self.title,
            "event_ticker": self.event_ticker,
            "status": self.status,
            "yes_bid": self.yes_bid,
            "yes_ask": self.yes_ask,
            "last_price": self.last_price,
            "yes_mid": self.yes_mid,
            "close_time": self.close_time,
            "floor_strike": self.floor_strike,
            "as_of": datetime.now(timezone.utc).isoformat(),
            "source": "kalshi",
        }


def load_private_key(path: str) -> rsa.RSAPrivateKey:
    with open(path, "rb") as f:
        key = serialization.load_pem_private_key(f.read(), password=None, backend=default_backend())
    if not isinstance(key, rsa.RSAPrivateKey):
        raise KalshiError(f"Expected RSA private key in {path}")
    return key


def sign_pss(private_key: rsa.RSAPrivateKey, text: str) -> str:
    sig = private_key.sign(
        text.encode(),
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256(),
    )
    return base64.b64encode(sig).decode()


def build_create_order_payload(
    *,
    ticker: str,
    action: str,
    side: str,
    count: int,
    limit_price_cents: int,
    time_in_force: str = "good_till_canceled",
    client_order_id: str | None = None,
) -> dict[str, Any]:
    """
    Intuitive action/side/cents → Kalshi V2 YES-leg payload.
    Matches mcp-server-kalshi translation table.
    """
    action = action.lower()
    side = side.lower()
    if action not in ("buy", "sell") or side not in ("yes", "no"):
        raise KalshiError("action must be buy|sell and side yes|no")
    yes_leg_cents = limit_price_cents if side == "yes" else 100 - limit_price_cents
    book_side = "bid" if (action, side) in {("buy", "yes"), ("sell", "no")} else "ask"
    payload: dict[str, Any] = {
        "ticker": ticker,
        "side": book_side,
        "count": str(int(count)),
        "price": f"{yes_leg_cents / 100:.4f}",
        "time_in_force": time_in_force,
        "self_trade_prevention_type": "taker_at_cross",
    }
    if client_order_id:
        payload["client_order_id"] = client_order_id
    return payload


class KalshiClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        env = (settings.kalshi_env or "prod").lower()
        if settings.kalshi_base_url:
            self.base = settings.kalshi_base_url.rstrip("/")
        elif env == "demo":
            self.base = "https://demo-api.kalshi.co/trade-api/v2"
        else:
            self.base = "https://api.elections.kalshi.com/trade-api/v2"
        self.api_key = settings.kalshi_key_id()
        path = settings.kalshi_private_key_path
        # default project path if unset
        if not path and Path.home().joinpath(".lns/kalshi_private.pem").is_file():
            path = str(Path.home() / ".lns" / "kalshi_private.pem")
        self.private_key_path = path
        self._private_key: rsa.RSAPrivateKey | None = None
        if path and Path(path).is_file():
            self._private_key = load_private_key(path)

    @property
    def has_credentials(self) -> bool:
        return bool(self.api_key and self._private_key)

    @property
    def env_label(self) -> str:
        return "PROD (real money)" if "demo" not in self.base else "DEMO (sandbox)"

    def _auth_headers(self, method: str, full_path: str) -> dict[str, str]:
        if not self.has_credentials:
            raise KalshiError(
                "Kalshi credentials required. Set KALSHI_API_KEY and KALSHI_PRIVATE_KEY_PATH "
                "(or ~/.lns/kalshi_private.pem)."
            )
        # full_path like /trade-api/v2/portfolio/balance — sign path without query
        path = full_path.split("?", 1)[0]
        if not path.startswith("/trade-api/"):
            # relative to base: base ends with /trade-api/v2
            path = "/trade-api/v2" + (full_path if full_path.startswith("/") else "/" + full_path)
            path = path.split("?", 1)[0]
        ts = str(int(time.time() * 1000))
        msg = ts + method.upper() + path
        assert self._private_key is not None and self.api_key is not None
        return {
            "KALSHI-ACCESS-KEY": self.api_key,
            "KALSHI-ACCESS-TIMESTAMP": ts,
            "KALSHI-ACCESS-SIGNATURE": sign_pss(self._private_key, msg),
            "Content-Type": "application/json",
        }

    def _request(
        self,
        method: str,
        rel_path: str,
        *,
        params: dict | None = None,
        json_body: dict | None = None,
        auth: bool = False,
    ) -> Any:
        rel = rel_path if rel_path.startswith("/") else f"/{rel_path}"
        url = self.base + rel
        # path for signing includes /trade-api/v2 prefix
        sign_path = "/trade-api/v2" + rel
        headers = {"Content-Type": "application/json"}
        if auth:
            headers = self._auth_headers(method, sign_path)
        with httpx.Client(timeout=30.0) as client:
            resp = client.request(method, url, params=params, json=json_body, headers=headers)
        if resp.status_code >= 400:
            raise KalshiError(f"Kalshi {method} {rel}: HTTP {resp.status_code} {resp.text[:500]}")
        if not resp.content:
            return {}
        return resp.json()

    def get_market(self, ticker: str) -> MarketQuote:
        ticker = ticker.strip()
        data = self._request("GET", f"/markets/{ticker}")
        m = data.get("market") or data
        bid = _cents_to_prob(m.get("yes_bid"))
        ask = _cents_to_prob(m.get("yes_ask"))
        last = _cents_to_prob(m.get("last_price"))
        mid = None
        if bid is not None and ask is not None:
            mid = (bid + ask) / 2.0
        elif last is not None:
            mid = last
        elif bid is not None:
            mid = bid
        elif ask is not None:
            mid = ask
        floor = m.get("floor_strike")
        try:
            floor_f = float(floor) if floor is not None else None
        except (TypeError, ValueError):
            floor_f = None
        return MarketQuote(
            ticker=m.get("ticker") or ticker,
            title=m.get("title") or "",
            event_ticker=m.get("event_ticker"),
            status=m.get("status"),
            yes_bid=bid,
            yes_ask=ask,
            last_price=last,
            yes_mid=mid,
            close_time=m.get("close_time") or m.get("expected_expiration_time"),
            floor_strike=floor_f,
            raw=m,
        )

    def get_balance(self) -> dict[str, Any]:
        return self._request("GET", "/portfolio/balance", auth=True)

    def create_order(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/portfolio/events/orders", json_body=payload, auth=True)

    def preview_order(
        self,
        *,
        ticker: str,
        action: str,
        side: str,
        count: int,
        limit_price_cents: int | None = None,
    ) -> dict[str, Any]:
        q = self.get_market(ticker)
        if limit_price_cents is None:
            if action == "buy" and side == "yes":
                # aggressive buy: pay ask if available
                p = q.yes_ask if q.yes_ask is not None else q.yes_mid
            elif action == "sell" and side == "yes":
                p = q.yes_bid if q.yes_bid is not None else q.yes_mid
            else:
                p = q.yes_mid
            if p is None:
                raise KalshiError(f"No price for {ticker}")
            limit_price_cents = _prob_to_cents(p)
        payload = build_create_order_payload(
            ticker=ticker,
            action=action,
            side=side,
            count=count,
            limit_price_cents=limit_price_cents,
            client_order_id=str(uuid.uuid4()),
        )
        est_cost = count * (limit_price_cents / 100.0)
        return {
            "env": self.env_label,
            "ticker": ticker,
            "action": action,
            "side": side,
            "count": count,
            "limit_price_cents": limit_price_cents,
            "est_max_cost_usd": est_cost,
            "quote": q.as_public_dict(),
            "payload": payload,
            "confirm_required": True,
            "message": (
                f"[{self.env_label}] Will {action.upper()} {count} {side.upper()} on {ticker} "
                f"@ {limit_price_cents}¢ (est max ${est_cost:.2f}). Pass confirm=true to execute."
            ),
        }

    def place_order(
        self,
        *,
        ticker: str,
        action: str,
        side: str,
        count: int,
        limit_price_cents: int | None = None,
        max_notional_usd: float = 3.0,
        max_contracts: int = 5,
    ) -> dict[str, Any]:
        if count < 1 or count > max_contracts:
            raise KalshiError(f"count must be 1..{max_contracts} (stake cap)")
        preview = self.preview_order(
            ticker=ticker,
            action=action,
            side=side,
            count=count,
            limit_price_cents=limit_price_cents,
        )
        if preview["est_max_cost_usd"] > max_notional_usd + 1e-9:
            raise KalshiError(
                f"est_max_cost ${preview['est_max_cost_usd']:.2f} exceeds cap ${max_notional_usd:.2f}"
            )
        result = self.create_order(preview["payload"])
        return {"preview": preview, "order_response": result}
