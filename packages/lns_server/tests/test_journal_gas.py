from pathlib import Path

from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.journal import TradeJournal
from lns_server.settings import Settings


def test_journal_20pct_exit(tmp_path: Path):
    j = TradeJournal(tmp_path / "j.db")
    pos = j.open_position(
        ticker="GAS-TEST",
        side="yes",
        contracts=1,
        entry_yes_mid=0.50,
        move_pct=0.20,
    )
    ev = j.evaluate_exit(pos, 0.55)
    assert ev["should_sell"] is False
    ev2 = j.evaluate_exit(pos, 0.60)
    assert ev2["should_sell"] is True
    closed = j.close_position(pos["id"], exit_yes_mid=0.60, exit_reason="move_20pct")
    assert closed["status"] == "closed"
    j.close()


def test_gas_graph_api(tmp_path: Path):
    settings = Settings(
        host="127.0.0.1",
        db_path=str(tmp_path / "g.db"),
        n_samples=200,
        openrouter_api_key=None,
    )
    app = create_app(settings)
    with TestClient(app) as c:
        r = c.post(
            "/use-cases/gas/graph",
            json={
                "ticker": "",
                "threshold_usd": 4.12,
                "market_yes_mid": 0.51,
                "name": "gas-test",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "market_implied_yes" in body["graph"]["nodes"]
        assert body["graph"]["nodes"]["market_implied_yes"]["parameters"]["value"] == 0.51
        assert body["exit_rule"]["move_pct"] == 0.2
        assert body["snapshot"] is not None


def test_journal_api(tmp_path: Path):
    settings = Settings(host="127.0.0.1", db_path=str(tmp_path / "g.db"), n_samples=100)
    app = create_app(settings)
    with TestClient(app) as c:
        r = c.post(
            "/journal/positions",
            json={
                "ticker": "GAS-TEST",
                "side": "yes",
                "contracts": 1,
                "entry_yes_mid": 0.44,
                "move_pct": 0.20,
            },
        )
        assert r.status_code == 200, r.text
        pid = r.json()["position"]["id"]
        # check-exit will call live Kalshi — expect 400 for fake ticker
        r2 = c.post(f"/journal/positions/{pid}/check-exit")
        assert r2.status_code in (200, 400)
