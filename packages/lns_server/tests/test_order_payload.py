from lns_server.kalshi_client import build_create_order_payload, _prob_to_cents


def test_buy_yes_payload():
    p = build_create_order_payload(
        ticker="GAS-TEST",
        action="buy",
        side="yes",
        count=1,
        limit_price_cents=51,
    )
    assert p["ticker"] == "GAS-TEST"
    assert p["side"] == "bid"
    assert p["count"] == "1"
    assert p["price"] == "0.5100"


def test_sell_yes_payload():
    p = build_create_order_payload(
        ticker="GAS-TEST",
        action="sell",
        side="yes",
        count=2,
        limit_price_cents=40,
    )
    assert p["side"] == "ask"
    assert p["count"] == "2"


def test_prob_to_cents():
    assert _prob_to_cents(0.51) == 51
    assert _prob_to_cents(0.0) == 1
    assert _prob_to_cents(1.0) == 99
