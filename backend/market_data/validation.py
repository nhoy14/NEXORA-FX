"""
NEXORA FX — Market Data Validation Engine
Strict validation of quotes, OHLC bars, timestamps, freshness, and market session state.
Never fabricates data. Returns explicit errors or flags when data fails validation.
"""

import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple, Optional
from backend.market_data.base import DataStatus, Candle, Quote, AssetClass

# Timeframe in minutes
TIMEFRAME_MINUTES = {
    "M1": 1,
    "M5": 5,
    "M15": 15,
    "M30": 30,
    "H1": 60,
    "H4": 240,
    "D1": 1440,
    "W1": 10080,
    "MN1": 43200,
}

def is_market_open(asset_class: AssetClass) -> bool:
    """
    Determines if market session is currently open based on standard UTC market hours.
    - Crypto: Open 24/7
    - Forex & Metals: Opens Sunday 21:00 UTC, Closes Friday 21:00 UTC
    - Equities & Commodities: Closes on weekends + specific weekday sessions
    """
    if asset_class == AssetClass.CRYPTO:
        return True

    now_utc = datetime.now(timezone.utc)
    weekday = now_utc.weekday()  # Monday is 0, Sunday is 6
    hour = now_utc.hour

    # Weekend check for traditional markets (Forex, Metals, Indices, Stocks, Commodities)
    if weekday == 5:  # Saturday -> Always closed
        return False
    if weekday == 6 and hour < 21:  # Sunday before 21:00 UTC -> Closed
        return False
    if weekday == 4 and hour >= 22:  # Friday after 22:00 UTC -> Closed
        return False

    return True

def validate_quote(quote: Quote) -> Tuple[bool, Optional[str]]:
    """Validates numeric fields and bid/ask integrity of Quote."""
    if not isinstance(quote.price, (int, float)) or math.isnan(quote.price) or quote.price <= 0:
        return False, f"Invalid price value: {quote.price}"

    if quote.bid is not None and (math.isnan(quote.bid) or quote.bid <= 0):
        return False, f"Invalid bid value: {quote.bid}"

    if quote.ask is not None and (math.isnan(quote.ask) or quote.ask <= 0):
        return False, f"Invalid ask value: {quote.ask}"

    if quote.bid is not None and quote.ask is not None and quote.ask < quote.bid:
        return False, f"Negative spread: Ask ({quote.ask}) < Bid ({quote.bid})"

    return True, None

def validate_candle_bar(c: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validates a single candle for OHLC physical and mathematical consistency."""
    try:
        t = int(c["time"])
        o = float(c["open"])
        h = float(c["high"])
        l = float(c["low"])
        cl = float(c["close"])
        v = float(c.get("volume", 0.0))
    except (KeyError, ValueError, TypeError) as ex:
        return False, f"Malformed candle bar fields: {ex}"

    if o <= 0 or h <= 0 or l <= 0 or cl <= 0:
        return False, f"Non-positive OHLC values found in candle at time {t}"

    if math.isnan(o) or math.isnan(h) or math.isnan(l) or math.isnan(cl):
        return False, f"NaN OHLC values found in candle at time {t}"

    if l > h:
        return False, f"Candle Low ({l}) is strictly greater than High ({h}) at time {t}"

    # Tolerance for floating point precision epsilon (0.000001)
    eps = 1e-6
    if h < max(o, cl) - eps:
        return False, f"Candle High ({h}) is less than max(Open, Close) ({max(o, cl)}) at time {t}"

    if l > min(o, cl) + eps:
        return False, f"Candle Low ({l}) is greater than min(Open, Close) ({min(o, cl)}) at time {t}"

    if v < 0:
        return False, f"Negative volume ({v}) at time {t}"

    return True, None

def validate_candle_series(
    candles: List[Dict[str, Any]],
    timeframe: str,
    asset_class: AssetClass
) -> Tuple[List[Dict[str, Any]], DataStatus, int, Optional[str]]:
    """
    Validates an entire candle series:
    - Sorts chronologically
    - Filters out invalid OHLC bars
    - Deduplicates timestamps
    - Computes missing observation counts
    - Determines DataStatus: LIVE, DELAYED, STALE, CLOSED, or INVALID
    """
    if not candles:
        return [], DataStatus.UNAVAILABLE, 0, "No candles provided"

    valid_candles = []
    seen_times = set()

    for bar in candles:
        ok, err = validate_candle_bar(bar)
        if not ok:
            continue
        bar_time = int(bar["time"])
        if bar_time in seen_times:
            continue
        seen_times.add(bar_time)
        valid_candles.append(bar)

    # Sort ascending by timestamp
    valid_candles.sort(key=lambda x: int(x["time"]))

    if len(valid_candles) < 3:
        return valid_candles, DataStatus.INVALID, 0, "Insufficient valid candles (< 3)"

    # Detect missing observations based on timeframe step
    tf_min = TIMEFRAME_MINUTES.get(timeframe.upper(), 15)
    expected_step_sec = tf_min * 60
    missing_count = 0

    for i in range(1, len(valid_candles)):
        gap_sec = int(valid_candles[i]["time"]) - int(valid_candles[i - 1]["time"])
        if gap_sec > expected_step_sec * 1.5:
            # Gaps during weekend or non-trading hours are normal for non-crypto
            missing_bars = int(gap_sec / expected_step_sec) - 1
            if missing_bars > 0:
                missing_count += min(missing_bars, 100)

    # Freshness evaluation on latest candle
    latest_bar = valid_candles[-1]
    latest_time_sec = int(latest_bar["time"])
    now_utc_sec = int(datetime.now(timezone.utc).timestamp())
    age_seconds = now_utc_sec - latest_time_sec

    # Check market open status
    open_now = is_market_open(asset_class)

    # Determine status
    if not open_now:
        status = DataStatus.CLOSED
    else:
        # Max acceptable delay for live status:
        # M1/M5: 2x bar interval + 300s
        # H1: 2x bar interval + 600s
        # D1: 2x bar interval
        freshness_threshold = max(expected_step_sec * 2 + 300, 900)
        if age_seconds <= freshness_threshold:
            status = DataStatus.LIVE
        elif age_seconds <= 86400:  # within 24h
            status = DataStatus.DELAYED
        else:
            status = DataStatus.STALE

    return valid_candles, status, missing_count, None
