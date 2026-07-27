"""Micro-stake journal + 20% contract-price move exit rule."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lns_kernel.scoring import relative_move, should_exit_on_move


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class TradeJournal:
    """
    SQLite journal for project Kalshi micro-stakes.

    Exit rule (default): SELL when YES mid moves ≥ move_pct (default 20%)
    relative to entry_yes_mid, in either direction:

        abs(mid_now - entry_mid) / entry_mid >= move_pct

    Entry mid must be > 0. For long YES, this is a volatility/time-box exit
    on the contract probability price (not the underlying gas $/gal).
    """

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = str(db_path)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init()

    def close(self) -> None:
        self._conn.close()

    def _init(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS positions (
              id TEXT PRIMARY KEY,
              ticker TEXT NOT NULL,
              side TEXT NOT NULL,
              contracts INTEGER NOT NULL,
              entry_yes_mid REAL NOT NULL,
              entry_at TEXT NOT NULL,
              move_pct REAL NOT NULL DEFAULT 0.20,
              status TEXT NOT NULL,
              exit_yes_mid REAL,
              exit_at TEXT,
              exit_reason TEXT,
              graph_id TEXT,
              notes TEXT,
              meta_json TEXT
            )
            """
        )
        self._conn.commit()

    def open_position(
        self,
        *,
        ticker: str,
        side: str,
        contracts: int,
        entry_yes_mid: float,
        move_pct: float = 0.20,
        graph_id: str | None = None,
        notes: str = "",
        meta: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if side not in ("yes", "no"):
            raise ValueError("side must be yes or no")
        if contracts < 1:
            raise ValueError("contracts must be >= 1")
        if entry_yes_mid <= 0 or entry_yes_mid > 1:
            raise ValueError("entry_yes_mid must be in (0, 1]")
        if move_pct <= 0:
            raise ValueError("move_pct must be > 0")
        pid = str(uuid.uuid4())
        now = utcnow()
        self._conn.execute(
            """
            INSERT INTO positions
            (id, ticker, side, contracts, entry_yes_mid, entry_at, move_pct, status, graph_id, notes, meta_json)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                pid,
                ticker,
                side,
                contracts,
                entry_yes_mid,
                now,
                move_pct,
                "open",
                graph_id,
                notes,
                json.dumps(meta or {}),
            ),
        )
        self._conn.commit()
        return self.get(pid)  # type: ignore[return-value]

    def get(self, position_id: str) -> dict[str, Any] | None:
        row = self._conn.execute("SELECT * FROM positions WHERE id=?", (position_id,)).fetchone()
        return self._row(row) if row else None

    def list_positions(self, *, status: str | None = "open") -> list[dict[str, Any]]:
        if status:
            rows = self._conn.execute(
                "SELECT * FROM positions WHERE status=? ORDER BY entry_at DESC", (status,)
            ).fetchall()
        else:
            rows = self._conn.execute("SELECT * FROM positions ORDER BY entry_at DESC").fetchall()
        return [self._row(r) for r in rows]

    def evaluate_exit(self, position: dict[str, Any], yes_mid_now: float) -> dict[str, Any]:
        entry = float(position["entry_yes_mid"])
        move_pct = float(position["move_pct"])
        if entry <= 0:
            rel = None
            hit = False
        else:
            rel = relative_move(entry, yes_mid_now)
            hit = should_exit_on_move(entry, yes_mid_now, move_pct)
        return {
            "position_id": position["id"],
            "ticker": position["ticker"],
            "side": position["side"],
            "entry_yes_mid": entry,
            "yes_mid_now": yes_mid_now,
            "rel_move": rel,
            "move_pct_threshold": move_pct,
            "should_sell": hit and position["status"] == "open",
            "rule": "abs(mid_now - entry_mid) / entry_mid >= move_pct",
        }

    def close_position(
        self,
        position_id: str,
        *,
        exit_yes_mid: float,
        exit_reason: str = "manual",
    ) -> dict[str, Any]:
        pos = self.get(position_id)
        if not pos:
            raise ValueError("position not found")
        if pos["status"] != "open":
            raise ValueError("position already closed")
        now = utcnow()
        self._conn.execute(
            """
            UPDATE positions
            SET status='closed', exit_yes_mid=?, exit_at=?, exit_reason=?
            WHERE id=?
            """,
            (exit_yes_mid, now, exit_reason, position_id),
        )
        self._conn.commit()
        return self.get(position_id)  # type: ignore[return-value]

    def _row(self, row: sqlite3.Row) -> dict[str, Any]:
        d = dict(row)
        if d.get("meta_json"):
            try:
                d["meta"] = json.loads(d["meta_json"])
            except json.JSONDecodeError:
                d["meta"] = {}
        else:
            d["meta"] = {}
        d.pop("meta_json", None)
        return d
