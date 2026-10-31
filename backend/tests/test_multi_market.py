"""
NEXORA FX — Multi-Market Integration Tests
Tests provider adapters, validation layer, multi-asset routing,
scanner, and all newly added REST endpoints.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.main import app
from backend.market_data.registry import provider_registry
from backend.market_data.service import market_data_service
from backend.market_data.base import AssetClass, DataStatus, Quote, Candle
from backend.market_data.validation import validate_candle_bar, validate_candle_series, is_market_open
from backend.risk_manager import risk_manager

client = TestClient(app)

def test_provider_registry():
    providers = provider_registry.list_providers()
    assert len(providers) >= 5
    provider_ids = [p.provider_id for p in providers]
    assert "mt5" in provider_ids
    assert "binance" in provider_ids
    assert "kraken" in provider_ids
    assert "yahoo" in provider_ids
    assert "xaus" in provider_ids
    assert "twelve_data" in provider_ids

def test_instruments_catalogue():
    instruments = provider_registry.list_instruments()
    assert len(instruments) >= 20
    symbols = [i.symbol for i in instruments]
    # Check coverage of each asset class
    assert "EURUSD" in symbols   # Forex
    assert "XAUUSD" in symbols   # Metals
    assert "BTCUSD" in symbols   # Crypto
    assert "US100" in symbols    # Indices
    assert "AAPL" in symbols     # Stocks
    assert "USOIL" in symbols    # Commodities
    assert "SPY" in symbols      # ETFs

def test_validation_rules_ohlc():
    # Valid candle
    ok, err = validate_candle_bar({"time": 1000, "open": 10.0, "high": 12.0, "low": 9.0, "close": 11.0, "volume": 100})
    assert ok is True
    assert err is None

    # Invalid: High < Open
    ok, err = validate_candle_bar({"time": 1000, "open": 15.0, "high": 12.0, "low": 9.0, "close": 11.0, "volume": 100})
    assert ok is False

    # Invalid: Low > Close
    ok, err = validate_candle_bar({"time": 1000, "open": 10.0, "high": 12.0, "low": 11.5, "close": 11.0, "volume": 100})
    assert ok is False

    # Invalid: Negative price
    ok, err = validate_candle_bar({"time": 1000, "open": -5.0, "high": 12.0, "low": 9.0, "close": 11.0, "volume": 100})
    assert ok is False

def test_validation_series():
    raw = [
        {"time": 1000, "open": 10.0, "high": 12.0, "low": 9.0, "close": 11.0, "volume": 10},
        {"time": 1000, "open": 10.0, "high": 12.0, "low": 9.0, "close": 11.0, "volume": 10}, # Duplicate
        {"time": 1900, "open": 11.0, "high": 13.0, "low": 10.5, "close": 12.5, "volume": 15},
        {"time": 2800, "open": 12.5, "high": 14.0, "low": 12.0, "close": 13.8, "volume": 20},
    ]
    valid_bars, status, missing, err = validate_candle_series(raw, "M15", AssetClass.CRYPTO)
    assert len(valid_bars) == 3 # Deduplicated
    assert valid_bars[0]["time"] < valid_bars[1]["time"] < valid_bars[2]["time"]

def test_api_providers_endpoints():
    res = client.get("/api/providers")
    assert res.status_code == 200
    providers = res.json()
    assert len(providers) >= 5

    res_status = client.get("/api/providers/status")
    assert res_status.status_code == 200
    statuses = res_status.json()
    assert len(statuses) >= 5
    # Verify twelve_data honestly reports auth required
    td_status = next((s for s in statuses if s["provider_id"] == "twelve_data"), None)
    assert td_status is not None
    assert td_status["auth_required"] is True

def test_api_markets_catalogue():
    res = client.get("/api/markets")
    assert res.status_code == 200
    markets = res.json()
    assert "FOREX" in markets
    assert "METALS" in markets
    assert "CRYPTO" in markets
    assert "INDICES" in markets
    assert "STOCKS" in markets
    assert "COMMODITIES" in markets

def test_api_quote_multi_asset():
    # Crypto quote (Binance or MT5 or Kraken)
    res_btc = client.get("/api/quote?symbol=BTCUSD")
    assert res_btc.status_code == 200
    data = res_btc.json()
    assert data["symbol"] == "BTCUSD"
    assert data["price"] > 0
    assert data["is_live"] is True

def test_api_scanner():
    res = client.get("/api/scanner?timeframe=H1&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "candidates" in data
    assert "total_scanned" in data
    assert data["total_scanned"] > 0

def test_api_watchlist_crud():
    # 1. Add item
    add_res = client.post("/api/watchlist", json={"symbol": "NVDA", "name": "NVIDIA", "asset_class": "STOCKS"})
    assert add_res.status_code == 200
    assert add_res.json()["success"] is True

    # 2. Get list
    get_res = client.get("/api/watchlist")
    assert get_res.status_code == 200
    symbols = [w["symbol"] for w in get_res.json()]
    assert "NVDA" in symbols

    # 3. Delete item
    del_res = client.delete("/api/watchlist/NVDA")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_risk_manager_multi_asset():
    # Forex lot sizing
    forex_calc = risk_manager.calculate_position(
        account_balance=10000.0,
        risk_pct=1.0,
        entry_price=1.1000,
        sl_price=1.0950,
        symbol="EURUSD"
    )
    assert forex_calc["valid"] is True
    assert forex_calc["unit_label"] == "Lots"
    assert forex_calc["sl_distance_pips"] == 50.0

    # Stock shares sizing
    stock_calc = risk_manager.calculate_position(
        account_balance=10000.0,
        risk_pct=1.0,
        entry_price=200.0,
        sl_price=190.0,
        symbol="AAPL"
    )
    assert stock_calc["valid"] is True
    assert stock_calc["unit_label"] == "Shares"
    assert stock_calc["recommended_position_size"] > 0
