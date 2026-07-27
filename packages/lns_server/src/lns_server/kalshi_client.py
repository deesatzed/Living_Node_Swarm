"""Kalshi market data client (read path). Prices in dollars 0–1 for YES mid."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx

from lns_server.settings import Settings


class KalshiError(RuntimeError):
    pass


@dataclass
class MarketQuote:
    ticker: str
    title: str
    event_ticker: str | None
    status: str | None
    yes_bid: float | None  # 0–1
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


def _cents_to_prob(v: Any) -> float | None:
    """Kalshi often returns prices in cents (0–100) or dollars (0–1)."""
    if v is None:
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    if x > 1.0:
        x = x / 100.0
    return max(0.0, min(1.0, x))


class KalshiClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        env = (settings.kalshi_env or "prod").lower()
        if env == "demo":
            self.base = "https://demo-api.kalshi.co/trade-api/v2"
        else:
            # elections host is the current public production trade API
            self.base = settings.kalshi_base_url or "https://api.elections.kalshi.com/trade-api/v2"

    def get_market(self, ticker: str) -> MarketQuote:
        ticker = ticker.strip()
        url = f"{self.base}/markets/{ticker}"
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url)
        if resp.status_code >= 400:
            raise KalshiError(f"Kalshi GET market {ticker}: HTTP {resp.status_code} {resp.text[:400]}")
        data = resp.json()
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

    def list_markets_for_series(self, series_ticker: str, *, status: str = "open", limit: int = 50) -> list[MarketQuote]:
        url = f"{self.base}/markets"
        params = {"series_ticker": series_ticker, "limit": limit}
        if status:
            params["status"] = status
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, params=params)
        if resp.status_code >= 400:
            raise KalshiError(f"Kalshi list markets: HTTP {resp.status_code} {resp.text[:400]}")
        out: list[MarketQuote] = []
        for m in resp.json().get("markets") or []:
            bid = _cents_to_prob(m.get("yes_bid"))
            ask = _cents_to_prob(m.get("yes_ask"))
            last = _cents_to_prob(m.get("last_price"))
            mid = None
            if bid is not None and ask is not None:
                mid = (bid + ask) / 2.0
            elif last is not None:
                mid = last
            floor = m.get("floor_strike")
            try:
                floor_f = float(floor) if floor is not None else None
            except (TypeError, ValueError):
                floor_f = None
            out.append(
                MarketQuote(
                    ticker=m.get("ticker") or "",
                    title=m.get("title") or "",
                    event_ticker=m.get("event_ticker"),
                    status=m.get("status"),
                    yes_bid=bid,
                    yes_ask=ask,
                    last_price=last,
                    yes_mid=mid,
                    close_time=m.get("close_time"),
                    floor_strike=floor_f,
                    raw=m,
                )
            )
        return out
