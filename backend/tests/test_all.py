"""
NEXORA FX — Comprehensive Unit & Integration Tests
Tests:
- Indicator calculations (EMA 9, 21, 50, 200, ATR)
- Trend detection (Bullish, Bearish, Neutral)
- MSNR and SMC detection (Swings, BOS, CHoCH, Liquidity Sweeps, FVGs, Order Blocks)
- Signal Engine (BUY, SELL, WAIT, Target calculations, Scoring)
- Risk Management & Gold Position Sizing
- Walk-forward Backtesting Engine
- Database CRUD & API endpoints
"""

import pytest
import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.indicators import calculate_ema, calculate_atr, compute_indicators
from backend.msnr_smc import MSNR_SMC_Analyzer
from backend.signal_engine import SignalEngine
from backend.risk_manager import RiskManager
from backend.backtester import BacktestEngine
from backend.database import init_db, add_journal_entry, get_all_journal_entries, delete_journal_entry

# Helper to generate synthetic candle sequence
def generate_test_candles(trend_type="UP", count=80, start_price=2650.0):
    candles = []
    curr = start_price
    start_time = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    
    for i in range(count):
        t = start_time + timedelta(minutes=15 * i)
        if trend_type == "UP":
            drift = 1.2 + (0.5 if i % 2 == 0 else -0.2)
        elif trend_type == "DOWN":
            drift = -1.2 + (-0.5 if i % 2 == 0 else 0.2)
        else:
            drift = 0.5 if i % 2 == 0 else -0.5
        
        o = curr
        c = o + drift
        h = max(o, c) + 0.8
        l = min(o, c) - 0.8
        curr = c
        
        candles.append({
            "time": int(t.timestamp()),
            "iso_time": t.isoformat(),
            "open": round(o, 2),
            "high": round(h, 2),
            "low": round(l, 2),
            "close": round(c, 2),
            "volume": 1500
        })
    return candles

# --- Indicator Tests ---
def test_ema_and_atr_calculation():
    candles = generate_test_candles("UP", count=60)
    df = pd.DataFrame(candles)
    
    ema_9 = calculate_ema(df["close"], 9)
    assert len(ema_9) == len(df)
    assert not ema_9.isna().all()
    
    atr = calculate_atr(df, 14)
    assert len(atr) == len(df)
    assert atr.iloc[-1] > 0

def test_bullish_and_bearish_trend_detection():
    # Uptrend
    up_candles = generate_test_candles("UP", count=70)
    res_up = compute_indicators(up_candles, ema_200_filter=False)
    assert res_up["trend"] == "BULLISH"
    assert "BULLISH" in res_up["trend"]

    # Downtrend
    down_candles = generate_test_candles("DOWN", count=70)
    res_down = compute_indicators(down_candles, ema_200_filter=False)
    assert res_down["trend"] == "BEARISH"

# --- SMC and MSNR Tests ---
def test_smc_analysis():
    candles = generate_test_candles("UP", count=80)
    analyzer = MSNR_SMC_Analyzer(swing_left=2, swing_right=2)
    res = analyzer.analyze(candles)
    
    assert "swings" in res
    assert "structure_state" in res
    assert "equilibrium" in res
    assert "order_blocks" in res
    assert "fair_value_gaps" in res
    assert "support_resistance" in res

    # Equilibrium check
    eq = res["equilibrium"]
    assert eq["range_high"] >= eq["range_low"]
    assert eq["midpoint_50"] == round((eq["range_high"] + eq["range_low"]) / 2.0, 2)

# --- Signal Engine Tests ---
def test_signal_engine_buy_and_wait():
    engine = SignalEngine(min_score_threshold=70)
    
    # In an aggressive uptrend with alignment
    candles = generate_test_candles("UP", count=80)
    ind = compute_indicators(candles, ema_200_filter=False)
    analyzer = MSNR_SMC_Analyzer(swing_left=2, swing_right=2)
    smc = analyzer.analyze(candles)
    
    sig = engine.generate_signal("M15", candles, ind, smc)
    assert sig["direction"] in ["BUY", "WAIT"]
    assert "setup_score" in sig
    assert "reasons" in sig
    assert "invalidations" in sig

    if sig["direction"] == "BUY":
        assert sig["entry_price"] > 0
        assert sig["sl_price"] < sig["entry_price"]
        assert sig["tp1_price"] > sig["entry_price"]
        assert sig["tp2_price"] > sig["tp1_price"]
        assert sig["tp3_price"] > sig["tp2_price"]

    # In insufficient candles, must return WAIT
    short_candles = candles[:10]
    short_ind = compute_indicators(short_candles)
    short_smc = analyzer.analyze(short_candles)
    wait_sig = engine.generate_signal("M15", short_candles, short_ind, short_smc)
    assert wait_sig["direction"] == "WAIT"

# --- Risk Management Tests ---
def test_risk_management_lot_sizing():
    rm = RiskManager(contract_size=100.0)
    
    # Balance $10,000, 1% risk = $100 risk capital
    # Entry 2700.00, SL 2695.00 -> 5.0 points distance
    # Spread 0.25, Slippage 0.10 -> Total risk points = 5.35
    # Loss per lot = 5.35 * 100 = $535 per lot
    # Lots = 100 / 535 = ~0.19 lots
    res = rm.calculate_position(
        account_balance=10000.0,
        risk_pct=1.0,
        entry_price=2700.00,
        sl_price=2695.00,
        spread_points=0.25,
        slippage_points=0.10
    )
    
    assert res["valid"] is True
    assert res["recommended_lots"] > 0
    assert 0.15 <= res["recommended_lots"] <= 0.25
    assert res["actual_risk_dollars"] <= 110.0  # Around $100 risk target
    assert "rr_targets" in res
    assert res["circuit_breakers"]["trading_permitted"] is True

def test_risk_management_circuit_breaker():
    rm = RiskManager()
    res = rm.calculate_position(
        account_balance=10000.0,
        risk_pct=1.0,
        entry_price=2700.00,
        sl_price=2695.00,
        daily_loss_limit_pct=3.0,
        current_daily_loss=350.0 # Breached $300 limit
    )
    assert res["circuit_breakers"]["daily_limit_breached"] is True
    assert res["circuit_breakers"]["trading_permitted"] is False
    assert len(res["warnings"]) > 0

# --- Backtest Engine Tests ---
def test_backtest_simulation():
    engine = BacktestEngine()
    candles = generate_test_candles("UP", count=90)
    
    res = engine.run_backtest(
        candles=candles,
        timeframe="M15",
        initial_balance=10000.0,
        risk_pct=1.0,
        min_score=50, # Lower score to trigger simulated trades
        target_rr=2.0
    )
    
    assert res["success"] is True
    assert "metrics" in res
    assert "equity_curve" in res
    assert res["metrics"]["initial_balance"] == 10000.0

# --- Database Tests ---
def test_database_journal_crud():
    init_db()
    entry = {
        "symbol": "XAUUSD",
        "timeframe": "M15",
        "direction": "BUY",
        "entry_price": 2680.50,
        "sl_price": 2675.50,
        "tp_price": 2690.50,
        "lot_size": 0.2,
        "notes": "Testing sniper trade journal"
    }
    
    new_id = add_journal_entry(entry)
    assert new_id > 0
    
    entries = get_all_journal_entries()
    found = any(e["id"] == new_id for e in entries)
    assert found is True
    
    deleted = delete_journal_entry(new_id)
    assert deleted is True
