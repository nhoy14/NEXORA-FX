"""
NEXORA FX — Database Layer
SQLite storage for:
- Trade Journal entries (with R-multiple, outcome, tags, screenshot)
- Backtest reports and equity curves
- Watchlist management
- Application settings
"""

import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "nexora_fx.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        pass
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Trade Journal Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        symbol TEXT NOT NULL DEFAULT 'XAUUSD',
        timeframe TEXT NOT NULL DEFAULT 'M15',
        direction TEXT NOT NULL, -- BUY, SELL
        entry_price REAL NOT NULL,
        sl_price REAL NOT NULL,
        tp_price REAL NOT NULL,
        exit_price REAL,
        lot_size REAL DEFAULT 0.1,
        pnl REAL DEFAULT 0.0,
        realized_r REAL DEFAULT 0.0,
        outcome TEXT DEFAULT 'OPEN', -- OPEN, WIN, LOSS, BREAKEVEN
        strategy_tags TEXT,
        notes TEXT,
        screenshot_url TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 2. Backtest History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS backtest_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        symbol TEXT NOT NULL DEFAULT 'XAUUSD',
        timeframe TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        total_trades INTEGER NOT NULL,
        winning_trades INTEGER NOT NULL,
        losing_trades INTEGER NOT NULL,
        win_rate REAL NOT NULL,
        profit_factor REAL NOT NULL,
        net_profit REAL NOT NULL,
        max_drawdown_pct REAL NOT NULL,
        avg_r REAL NOT NULL,
        params_json TEXT,
        equity_curve_json TEXT
    )
    """)

    # 3. Watchlist Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT,
        asset_class TEXT NOT NULL,
        provider TEXT DEFAULT 'auto',
        added_at TEXT NOT NULL
    )
    """)

    # 4. App Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Seed Default Watchlist
    default_watchlist = [
        {"symbol": "XAUUSD", "name": "Gold Spot / US Dollar", "asset_class": "METALS", "provider": "auto"},
        {"symbol": "EURUSD", "name": "Euro / US Dollar", "asset_class": "FOREX", "provider": "auto"},
        {"symbol": "GBPUSD", "name": "British Pound / US Dollar", "asset_class": "FOREX", "provider": "auto"},
        {"symbol": "USDJPY", "name": "US Dollar / Japanese Yen", "asset_class": "FOREX", "provider": "auto"},
        {"symbol": "BTCUSD", "name": "Bitcoin / US Dollar", "asset_class": "CRYPTO", "provider": "auto"},
        {"symbol": "ETHUSD", "name": "Ethereum / US Dollar", "asset_class": "CRYPTO", "provider": "auto"},
        {"symbol": "US100", "name": "Nasdaq 100 Index", "asset_class": "INDICES", "provider": "auto"},
        {"symbol": "AAPL", "name": "Apple Inc.", "asset_class": "STOCKS", "provider": "auto"},
        {"symbol": "USOIL", "name": "Crude Oil (WTI)", "asset_class": "COMMODITIES", "provider": "auto"},
    ]

    for item in default_watchlist:
        cursor.execute("SELECT id FROM watchlist WHERE symbol = ?", (item["symbol"],))
        if not cursor.fetchone():
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                "INSERT INTO watchlist (symbol, name, asset_class, provider, added_at) VALUES (?, ?, ?, ?, ?)",
                (item["symbol"], item["name"], item["asset_class"], item["provider"], now_iso)
            )

    # Seed Default Settings
    default_settings = {
        "broker": {
            "symbol": "XAUUSD",
            "contract_size": 100.0,
            "tick_size": 0.01,
            "tick_value": 1.0,
            "spread_points": 0.25,
            "slippage_points": 0.10
        },
        "risk": {
            "account_balance": 10000.0,
            "risk_per_trade_pct": 1.0,
            "daily_loss_limit_pct": 3.0,
            "max_trades_per_day": 5,
            "min_rr_ratio": 1.5
        },
        "indicators": {
            "ema_fast": 9,
            "ema_medium": 21,
            "ema_slow": 50,
            "ema_baseline": 200,
            "ema_200_filter": True,
            "atr_period": 14,
            "atr_multiplier_sl": 1.5
        },
        "smc": {
            "swing_left_bars": 3,
            "swing_right_bars": 2,
            "fvg_min_size_points": 0.5,
            "ob_lookback_bars": 30,
            "liquidity_tolerance_points": 0.3
        },
        "signals": {
            "min_score_threshold": 70,
            "auto_refresh_seconds": 15,
            "audio_alerts": True,
            "push_notifications": True
        },
        "data_feed": {
            "provider": "auto"
        }
    }

    for key, val in default_settings.items():
        cursor.execute("SELECT setting_key FROM app_settings WHERE setting_key = ?", (key,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)",
                (key, json.dumps(val), datetime.now(timezone.utc).isoformat())
            )

    conn.commit()
    conn.close()

# --- Watchlist Helpers ---
def get_all_watchlist_items() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM watchlist ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_watchlist_item(symbol: str, name: str = "", asset_class: str = "FOREX", provider: str = "auto") -> bool:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO watchlist (symbol, name, asset_class, provider, added_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
            name = excluded.name,
            asset_class = excluded.asset_class,
            provider = excluded.provider
        """, (symbol.upper(), name, asset_class.upper(), provider, now_str))
        conn.commit()
        return True
    finally:
        conn.close()

def remove_watchlist_item(symbol: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol.upper(),))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0

# --- Journal Helpers ---
def get_all_journal_entries() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM journal_entries ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_journal_entry(entry: Dict[str, Any]) -> int:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO journal_entries (
            timestamp, symbol, timeframe, direction, entry_price, sl_price, tp_price,
            exit_price, lot_size, pnl, realized_r, outcome, strategy_tags, notes, screenshot_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            entry.get("timestamp") or now_str,
            entry.get("symbol", "XAUUSD"),
            entry.get("timeframe", "M15"),
            entry.get("direction", "BUY").upper(),
            float(entry.get("entry_price", 0.0)),
            float(entry.get("sl_price", 0.0)),
            float(entry.get("tp_price", 0.0)),
            float(entry.get("exit_price")) if entry.get("exit_price") is not None else None,
            float(entry.get("lot_size", 0.1)),
            float(entry.get("pnl", 0.0)),
            float(entry.get("realized_r", 0.0)),
            entry.get("outcome", "OPEN").upper(),
            entry.get("strategy_tags", "") or "",
            entry.get("notes", "") or "",
            entry.get("screenshot_url", "") or "",
            now_str
        ))
        conn.commit()
        entry_id = cursor.lastrowid
        return entry_id
    finally:
        conn.close()

def update_journal_entry(entry_id: int, entry: Dict[str, Any]) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE journal_entries SET
        direction = ?, entry_price = ?, sl_price = ?, tp_price = ?, exit_price = ?,
        lot_size = ?, pnl = ?, realized_r = ?, outcome = ?, strategy_tags = ?, notes = ?, screenshot_url = ?
    WHERE id = ?
    """, (
        entry.get("direction", "BUY").upper(),
        float(entry.get("entry_price", 0.0)),
        float(entry.get("sl_price", 0.0)),
        float(entry.get("tp_price", 0.0)),
        float(entry.get("exit_price")) if entry.get("exit_price") is not None else None,
        float(entry.get("lot_size", 0.1)),
        float(entry.get("pnl", 0.0)),
        float(entry.get("realized_r", 0.0)),
        entry.get("outcome", "OPEN").upper(),
        entry.get("strategy_tags", ""),
        entry.get("notes", ""),
        entry.get("screenshot_url", ""),
        entry_id
    ))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0

def delete_journal_entry(entry_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM journal_entries WHERE id = ?", (entry_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0

# --- Backtest Helpers ---
def save_backtest_record(record: Dict[str, Any]) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO backtest_records (
        timestamp, symbol, timeframe, start_date, end_date, total_trades, winning_trades,
        losing_trades, win_rate, profit_factor, net_profit, max_drawdown_pct, avg_r,
        params_json, equity_curve_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.get("timestamp", datetime.now(timezone.utc).isoformat()),
        record.get("symbol", "XAUUSD"),
        record.get("timeframe", "M15"),
        record.get("start_date", ""),
        record.get("end_date", ""),
        int(record.get("total_trades", 0)),
        int(record.get("winning_trades", 0)),
        int(record.get("losing_trades", 0)),
        float(record.get("win_rate", 0.0)),
        float(record.get("profit_factor", 0.0)),
        float(record.get("net_profit", 0.0)),
        float(record.get("max_drawdown_pct", 0.0)),
        float(record.get("avg_r", 0.0)),
        json.dumps(record.get("params", {})),
        json.dumps(record.get("equity_curve", []))
    ))
    conn.commit()
    record_id = cursor.lastrowid
    conn.close()
    return record_id

def get_backtest_records(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM backtest_records ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    records = []
    for row in rows:
        d = dict(row)
        try:
            d["params"] = json.loads(d["params_json"]) if d.get("params_json") else {}
        except Exception:
            d["params"] = {}
        try:
            d["equity_curve"] = json.loads(d["equity_curve_json"]) if d.get("equity_curve_json") else []
        except Exception:
            d["equity_curve"] = []
        records.append(d)
    return records

# --- Settings Helpers ---
def get_all_settings() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT setting_key, setting_value FROM app_settings")
    rows = cursor.fetchall()
    conn.close()
    result = {}
    for r in rows:
        try:
            result[r["setting_key"]] = json.loads(r["setting_value"])
        except Exception:
            result[r["setting_key"]] = r["setting_value"]
    return result

def update_setting(key: str, value: Any) -> bool:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        val_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        cursor.execute("""
        INSERT INTO app_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET
            setting_value = excluded.setting_value,
            updated_at = excluded.updated_at
        """, (key, val_str, now_str))
        conn.commit()
        return True
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
