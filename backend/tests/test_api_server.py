"""
NEXORA FX — API Integration Tests
Tests all endpoints using FastAPI TestClient:
- Frontend static serving
- Market data feed & health
- Technical analysis & indicators
- SMC & signal generation
- Multi-timeframe confluence
- Risk calculation
- Backtesting engine execution
- Trade journal CRUD
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.main import app

client = TestClient(app)

def test_frontend_serving():
    response = client.get("/")
    assert response.status_code == 200
    assert "NEXORA FX" in response.text
    assert ('id="root"' in response.text or "XAUUSD" in response.text)

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "market_data_engine" in data

def test_market_ticker():
    response = client.get("/api/market/xauusd")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "XAUUSD"
    assert "price" in data

def test_candles_endpoint():
    response = client.get("/api/candles?timeframe=M15&limit=50")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["candles"]) > 0
    assert "open" in data["candles"][0]
    assert "high" in data["candles"][0]
    assert "low" in data["candles"][0]
    assert "close" in data["candles"][0]

def test_analysis_endpoint():
    response = client.get("/api/analysis?timeframe=M15")
    assert response.status_code == 200
    data = response.json()
    assert "indicators" in data
    assert "market_structure" in data
    assert "signal" in data
    assert data["signal"]["direction"] in ["BUY", "SELL", "WAIT"]

def test_mtf_endpoint():
    response = client.get("/api/mtf")
    assert response.status_code == 200
    data = response.json()
    assert "overall_bias" in data
    assert "confluence_score" in data
    assert "matrix" in data
    assert "H4" in data["matrix"]
    assert "H1" in data["matrix"]
    assert "M15" in data["matrix"]
    assert "M5" in data["matrix"]

def test_risk_calculate_endpoint():
    payload = {
        "account_balance": 10000.0,
        "risk_pct": 1.0,
        "entry_price": 2680.00,
        "sl_price": 2675.00,
        "spread_points": 0.25,
        "slippage_points": 0.10,
        "contract_size": 100.0
    }
    response = client.post("/api/risk/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["recommended_lots"] > 0
    assert "circuit_breakers" in data

def test_backtest_endpoint():
    payload = {
        "timeframe": "M15",
        "candle_count": 100,
        "initial_balance": 10000.0,
        "risk_pct": 1.0,
        "min_score": 60,
        "target_rr": 2.0,
        "spread_points": 0.25,
        "slippage_points": 0.10,
        "commission_per_lot": 5.0,
        "out_of_sample_split": 0.2
    }
    response = client.post("/api/backtest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "metrics" in data
    assert "equity_curve" in data
    assert "trades" in data

def test_journal_endpoints():
    # 1. Create entry
    create_payload = {
        "symbol": "XAUUSD",
        "timeframe": "M15",
        "direction": "BUY",
        "entry_price": 2685.00,
        "sl_price": 2680.00,
        "tp_price": 2695.00,
        "lot_size": 0.15,
        "outcome": "OPEN",
        "notes": "Testing sniper journal API"
    }
    create_res = client.post("/api/journal", json=create_payload)
    assert create_res.status_code == 200
    entry_id = create_res.json()["id"]

    # 2. Get entries
    get_res = client.get("/api/journal")
    assert get_res.status_code == 200
    entries = get_res.json()["entries"]
    assert any(e["id"] == entry_id for e in entries)

    # 3. Delete entry
    del_res = client.delete(f"/api/journal/{entry_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_settings_endpoints():
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    settings = get_res.json()
    assert "broker" in settings

    update_payload = {"risk": {"account_balance": 15000.0, "risk_per_trade_pct": 1.5}}
    post_res = client.post("/api/settings", json=update_payload)
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True

def test_crazii_endpoint():
    response = client.get("/api/crazii?symbol=XAUUSD&timeframe=M15")
    assert response.status_code == 200
    data = response.json()
    assert "op" in data
    assert "mlp" in data
    assert "ksi" in data
    assert "kcx" in data
    assert "diamond_trigger" in data
    assert "classified_candles" in data
    assert data["op"]["bias"] in ["BUY_ONLY", "SELL_ONLY", "WAIT"]
    assert 0 <= data["ksi"]["score"] <= 100

def test_analysis_includes_crazii():
    response = client.get("/api/analysis?symbol=XAUUSD&timeframe=M15")
    assert response.status_code == 200
    data = response.json()
    assert "crazii" in data
    assert "op" in data["crazii"]
    assert "ksi" in data["crazii"]

def test_new_redesign_endpoints():
    # 1. Market symbol
    res = client.get("/api/market/XAUUSD")
    assert res.status_code == 200
    assert "price" in res.json()

    # 2. Candles by symbol
    res = client.get("/api/candles/XAUUSD?timeframe=M15&limit=50")
    assert res.status_code == 200
    assert "candles" in res.json()

    # 3. Analysis by symbol
    res = client.get("/api/analysis/XAUUSD?timeframe=M15")
    assert res.status_code == 200
    assert res.json()["symbol"] == "XAUUSD"

    # 4. EMA analysis
    res = client.get("/api/ema/XAUUSD?timeframe=M15")
    assert res.status_code == 200
    data = res.json()
    assert "ema9" in data
    assert "alignment" in data

    # 5. MSNR analysis
    res = client.get("/api/msnr/XAUUSD?timeframe=M15")
    assert res.status_code == 200
    data = res.json()
    assert "structure_state" in data
    assert "classic_a" in data
    assert "classic_v" in data

    # 6. Data sources alias
    res = client.get("/api/data-sources")
    assert res.status_code == 200

    # 7. Screenshot analyze
    res = client.post("/api/screenshot/analyze", json={"symbol": "XAUUSD", "timeframe": "M15"})
    assert res.status_code == 200
    assert res.json()["success"] is True
