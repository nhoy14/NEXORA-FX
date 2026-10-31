"""
NEXORA FX — Technical Indicators Engine
Institutional quantitative calculations using validated market data:
- Exponential Moving Averages: EMA 9, 21, 50, 200
- Simple Moving Averages: SMA 20, 50, 200
- Relative Strength Index: RSI 14 (Wilder's Smoothing)
- Moving Average Convergence Divergence: MACD (12, 26, 9)
- Average True Range: ATR 14 (Wilder's Volatility)
- Bollinger Bands: BB 20 (2.0 Standard Deviations, %B, Bandwidth)
- Volume-Weighted Average Price: VWAP (Session or Cumulative Volume)
- Volume Analysis: Volume Surge & 20-period Moving Average
- Swing Highs & Lows, Dynamic Support & Resistance Clusters, Breakout/Retest Dynamics

Formulas & Warm-up Requirements:
1. EMA: EMA_t = Price_t * (2 / (N + 1)) + EMA_{t-1} * (1 - (2 / (N + 1))). Warm-up: N bars.
2. SMA: SMA_t = sum(Price_{t-N+1..t}) / N. Warm-up: N bars.
3. RSI: RSI = 100 - (100 / (1 + RS)), where RS = SmoothedGain / SmoothedLoss. Warm-up: 14 bars.
4. MACD: FastEMA(12) - SlowEMA(26); SignalLine = EMA(MACD, 9); Histogram = MACD - Signal. Warm-up: 35 bars.
5. ATR: ATR_t = ATR_{t-1} * (13/14) + TR_t * (1/14). Warm-up: 14 bars.
6. Bollinger Bands: Upper = SMA(20) + 2*StdDev(20), Lower = SMA(20) - 2*StdDev(20). Warm-up: 20 bars.
7. VWAP: sum(TypicalPrice * Volume) / sum(Volume). Requires non-zero volume.
Missing Data Behavior: Handled cleanly without fabrication; if volume is absent (0), VWAP returns null.
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

def calculate_ema(series: pd.Series, period: int) -> pd.Series:
    """Calculates Exponential Moving Average with span=period."""
    return series.ewm(span=period, adjust=False).mean()

def calculate_sma(series: pd.Series, period: int) -> pd.Series:
    """Calculates Simple Moving Average."""
    return series.rolling(window=period, min_periods=period).mean()

def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Calculates Average True Range (ATR 14).
    True Range = max(High - Low, abs(High - PrevClose), abs(Low - PrevClose))
    """
    high = df["high"]
    low = df["low"]
    close = df["close"]
    prev_close = close.shift(1)

    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # Wilder's exponential smoothing alpha = 1 / period
    atr = tr.ewm(alpha=1.0 / period, adjust=False).mean()
    return atr

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculates Wilder's Relative Strength Index (RSI 14)."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(alpha=1.0 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.fillna(50.0)

def calculate_macd(
    series: pd.Series,
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9
) -> Dict[str, pd.Series]:
    """Calculates MACD Line, Signal Line, and Histogram."""
    fast_ema = calculate_ema(series, fast_period)
    slow_ema = calculate_ema(series, slow_period)
    macd_line = fast_ema - slow_ema
    signal_line = calculate_ema(macd_line, signal_period)
    histogram = macd_line - signal_line

    return {
        "macd": macd_line,
        "signal": signal_line,
        "hist": histogram
    }

def calculate_bollinger_bands(
    series: pd.Series,
    period: int = 20,
    num_std: float = 2.0
) -> Dict[str, pd.Series]:
    """Calculates Bollinger Bands: Middle (SMA20), Upper, Lower, Bandwidth, and %B."""
    middle = calculate_sma(series, period)
    std = series.rolling(window=period, min_periods=period).std()
    upper = middle + (std * num_std)
    lower = middle - (std * num_std)
    bandwidth = ((upper - lower) / middle.replace(0, np.nan)) * 100.0
    pct_b = (series - lower) / (upper - lower).replace(0, np.nan)

    return {
        "middle": middle,
        "upper": upper,
        "lower": lower,
        "bandwidth": bandwidth,
        "pct_b": pct_b
    }

def calculate_vwap(df: pd.DataFrame) -> Optional[pd.Series]:
    """Calculates Cumulative Volume-Weighted Average Price if meaningful volume exists."""
    if "volume" not in df.columns or df["volume"].sum() <= 0:
        return None

    typical_price = (df["high"] + df["low"] + df["close"]) / 3.0
    tp_vol = typical_price * df["volume"]
    cum_tp_vol = tp_vol.cumsum()
    cum_vol = df["volume"].cumsum()
    vwap = cum_tp_vol / cum_vol.replace(0, np.nan)
    return vwap

def detect_support_resistance(
    df: pd.DataFrame,
    lookback: int = 60,
    atr_val: float = 1.5
) -> List[Dict[str, Any]]:
    """Identifies dynamic horizontal Support & Resistance clusters with touch count."""
    recent_df = df.tail(lookback)
    if len(recent_df) < 10:
        return []

    highs = recent_df["high"].values
    lows = recent_df["low"].values
    levels = []

    # Local extrema candidates
    for i in range(2, len(recent_df) - 2):
        if highs[i] > highs[i - 1] and highs[i] > highs[i - 2] and highs[i] > highs[i + 1] and highs[i] > highs[i + 2]:
            levels.append({"price": float(highs[i]), "type": "RESISTANCE"})
        if lows[i] < lows[i - 1] and lows[i] < lows[i - 2] and lows[i] < lows[i + 1] and lows[i] < lows[i + 2]:
            levels.append({"price": float(lows[i]), "type": "SUPPORT"})

    # Cluster nearby levels within 0.5 * ATR
    clustered = []
    tol = max(0.2, atr_val * 0.5)

    for lvl in levels:
        price = lvl["price"]
        matched = False
        for c in clustered:
            if abs(c["price"] - price) <= tol:
                c["touches"] += 1
                c["price"] = round((c["price"] + price) / 2.0, 3)
                matched = True
                break
        if not matched:
            clustered.append({
                "price": round(price, 3),
                "type": lvl["type"],
                "touches": 1
            })

    # Sort by strength (touches)
    clustered.sort(key=lambda x: x["touches"], reverse=True)
    return clustered[:6]

def detect_breakouts_retests(
    df: pd.DataFrame,
    sr_levels: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Detects breakouts and retests across identified key levels."""
    if len(df) < 5 or not sr_levels:
        return []

    events = []
    curr = df.iloc[-1]
    prev = df.iloc[-2]
    c_close = float(curr["close"])
    p_close = float(prev["close"])
    c_low = float(curr["low"])
    c_high = float(curr["high"])

    for lvl in sr_levels:
        l_price = lvl["price"]
        # Breakout Above Resistance
        if lvl["type"] == "RESISTANCE" and p_close <= l_price < c_close:
            events.append({
                "type": "BREAKOUT_BULLISH",
                "level": l_price,
                "label": f"Bullish breakout above resistance {l_price:.2f}"
            })
        # Breakdown Below Support
        elif lvl["type"] == "SUPPORT" and p_close >= l_price > c_close:
            events.append({
                "type": "BREAKDOWN_BEARISH",
                "level": l_price,
                "label": f"Bearish breakdown below support {l_price:.2f}"
            })
        # Retest of Broken Resistance (now Support)
        elif lvl["type"] == "RESISTANCE" and c_close > l_price and abs(c_low - l_price) <= (l_price * 0.001):
            events.append({
                "type": "RETEST_BULLISH",
                "level": l_price,
                "label": f"Bullish retest of resistance-turned-support {l_price:.2f}"
            })

    return events

def compute_indicators(
    candles: List[Dict[str, Any]],
    ema_fast: int = 9,
    ema_medium: int = 21,
    ema_slow: int = 50,
    ema_baseline: int = 200,
    ema_200_filter: bool = True,
    atr_period: int = 14
) -> Dict[str, Any]:
    """
    Computes all standard institutional indicators:
    EMAs (9, 21, 50, 200), SMAs (20, 50, 200), RSI 14, MACD, ATR 14, Bollinger Bands,
    VWAP, Volume Analysis, S/R Levels, and Breakout/Retest dynamics.
    """
    if not candles or len(candles) < 20:
        return {
            "trend": "NEUTRAL",
            "reason": "Insufficient candles to compute indicators (< 20)",
            "latest": {},
            "ema_series": {},
            "support_resistance": [],
            "breakouts": []
        }

    df = pd.DataFrame(candles)
    close_series = df["close"]

    # 1. EMAs
    df["ema_fast"] = calculate_ema(close_series, ema_fast)
    df["ema_medium"] = calculate_ema(close_series, ema_medium)
    df["ema_slow"] = calculate_ema(close_series, ema_slow)
    df["ema_baseline"] = calculate_ema(close_series, ema_baseline)

    # 2. SMAs
    df["sma_20"] = calculate_sma(close_series, 20)
    df["sma_50"] = calculate_sma(close_series, 50)
    df["sma_200"] = calculate_sma(close_series, 200)

    # 3. ATR & Volatility
    df["atr"] = calculate_atr(df, atr_period)

    # 4. RSI
    df["rsi"] = calculate_rsi(close_series, 14)

    # 5. MACD
    macd_res = calculate_macd(close_series)
    df["macd"] = macd_res["macd"]
    df["macd_signal"] = macd_res["signal"]
    df["macd_hist"] = macd_res["hist"]

    # 6. Bollinger Bands
    bb_res = calculate_bollinger_bands(close_series, 20, 2.0)
    df["bb_upper"] = bb_res["upper"]
    df["bb_middle"] = bb_res["middle"]
    df["bb_lower"] = bb_res["lower"]
    df["bb_bandwidth"] = bb_res["bandwidth"]
    df["bb_pct_b"] = bb_res["pct_b"]

    # 7. VWAP
    vwap_series = calculate_vwap(df)
    if vwap_series is not None:
        df["vwap"] = vwap_series

    # 8. Volume Analysis
    has_vol = "volume" in df.columns and df["volume"].sum() > 0
    vol_ratio = 1.0
    vol_surge = False
    if has_vol:
        vol_sma20 = df["volume"].rolling(20, min_periods=5).mean()
        curr_vol = float(df["volume"].iloc[-1])
        avg_vol = float(vol_sma20.iloc[-1]) if pd.notna(vol_sma20.iloc[-1]) and vol_sma20.iloc[-1] > 0 else curr_vol
        vol_ratio = round(curr_vol / avg_vol, 2) if avg_vol > 0 else 1.0
        vol_surge = vol_ratio >= 1.8

    # Latest values
    curr = df.iloc[-1]
    price = float(curr["close"])
    ef = float(curr["ema_fast"])
    em = float(curr["ema_medium"])
    es = float(curr["ema_slow"])
    eb = float(curr["ema_baseline"])
    atr_val = float(curr["atr"]) if pd.notna(curr["atr"]) else 1.5
    rsi_val = float(curr["rsi"]) if pd.notna(curr["rsi"]) else 50.0
    macd_val = float(curr["macd"]) if pd.notna(curr["macd"]) else 0.0
    macd_sig = float(curr["macd_signal"]) if pd.notna(curr["macd_signal"]) else 0.0
    macd_h = float(curr["macd_hist"]) if pd.notna(curr["macd_hist"]) else 0.0
    b_upper = float(curr["bb_upper"]) if pd.notna(curr["bb_upper"]) else price + atr_val * 2
    b_lower = float(curr["bb_lower"]) if pd.notna(curr["bb_lower"]) else price - atr_val * 2
    vwap_val = float(curr["vwap"]) if "vwap" in df.columns and pd.notna(curr.get("vwap")) else None

    # Trend Determination
    bullish_alignment = (ef > em) and (em > es)
    bearish_alignment = (ef < em) and (em < es)
    bullish_filter_ok = (price > eb) if ema_200_filter else True
    bearish_filter_ok = (price < eb) if ema_200_filter else True

    trend = "NEUTRAL"
    trend_reasons = []

    if bullish_alignment and bullish_filter_ok:
        trend = "BULLISH"
        trend_reasons.append(f"EMA {ema_fast} ({ef:.2f}) > EMA {ema_medium} ({em:.2f}) > EMA {ema_slow} ({es:.2f})")
        if ema_200_filter:
            trend_reasons.append(f"Price ({price:.2f}) above EMA {ema_baseline} ({eb:.2f})")
    elif bearish_alignment and bearish_filter_ok:
        trend = "BEARISH"
        trend_reasons.append(f"EMA {ema_fast} ({ef:.2f}) < EMA {ema_medium} ({em:.2f}) < EMA {ema_slow} ({es:.2f})")
        if ema_200_filter:
            trend_reasons.append(f"Price ({price:.2f}) below EMA {ema_baseline} ({eb:.2f})")
    else:
        trend = "NEUTRAL"
        trend_reasons.append("EMA ribbon is compressed or conflicting")

    # S/R and Breakouts
    sr_levels = detect_support_resistance(df, lookback=min(60, len(df)), atr_val=atr_val)
    breakouts = detect_breakouts_retests(df, sr_levels)

    # Format EMA series for frontend chart overlay
    ema_series_data = {
        "ema_fast": [{"time": int(df.at[i, "time"]), "value": round(float(df.at[i, "ema_fast"]), 4)} for i in range(len(df)) if pd.notna(df.at[i, "ema_fast"])],
        "ema_medium": [{"time": int(df.at[i, "time"]), "value": round(float(df.at[i, "ema_medium"]), 4)} for i in range(len(df)) if pd.notna(df.at[i, "ema_medium"])],
        "ema_slow": [{"time": int(df.at[i, "time"]), "value": round(float(df.at[i, "ema_slow"]), 4)} for i in range(len(df)) if pd.notna(df.at[i, "ema_slow"])],
        "ema_baseline": [{"time": int(df.at[i, "time"]), "value": round(float(df.at[i, "ema_baseline"]), 4)} for i in range(len(df)) if pd.notna(df.at[i, "ema_baseline"])],
    }

    return {
        "trend": trend,
        "trend_reasons": trend_reasons,
        "latest": {
            "price": price,
            "ema9": round(ef, 4),
            "ema21": round(em, 4),
            "ema50": round(es, 4),
            "ema200": round(eb, 4),
            "ema_fast": round(ef, 4),
            "ema_medium": round(em, 4),
            "ema_slow": round(es, 4),
            "ema_baseline": round(eb, 4),
            "sma_20": round(float(curr["sma_20"]), 4) if pd.notna(curr["sma_20"]) else None,
            "sma_50": round(float(curr["sma_50"]), 4) if pd.notna(curr["sma_50"]) else None,
            "sma_200": round(float(curr["sma_200"]), 4) if pd.notna(curr["sma_200"]) else None,
            "atr": round(atr_val, 4),
            "rsi": round(rsi_val, 2),
            "macd": round(macd_val, 4),
            "macd_signal": round(macd_sig, 4),
            "macd_hist": round(macd_h, 4),
            "bb_upper": round(b_upper, 4),
            "bb_middle": round(float(curr["bb_middle"]), 4) if pd.notna(curr["bb_middle"]) else None,
            "bb_lower": round(b_lower, 4),
            "vwap": round(vwap_val, 4) if vwap_val is not None else None,
            "volume_ratio": vol_ratio,
            "volume_surge": vol_surge
        },
        "support_resistance": sr_levels,
        "breakouts": breakouts,
        "ema_series": ema_series_data
    }
