from pathlib import Path

from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def test_bootstrap_graph_only(tmp_path: Path):
    settings = Settings(
        host="127.0.0.1",
        db_path=str(tmp_path / "g.db"),
        n_samples=150,
        openrouter_api_key=None,
    )
    app = create_app(settings)
    with TestClient(app) as c:
        r = c.post(
            "/demo/gas/bootstrap",
            json={
                "ticker": "",
                "threshold_usd": 4.12,
                "market_yes_mid": 0.51,
                "expand_ai": False,
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["graph"]["nodes"]["market_implied_yes"]["parameters"]["value"] == 0.51
        assert body["snapshot"] is not None
        assert "model_price_index" in body["graph"]["nodes"]
