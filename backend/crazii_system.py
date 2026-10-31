"""
NEXORA FX — CRAZII System Quantitative Analysis Engine
Implements CRAZII (crazii.com) Institutional Framework:
- OP (Opening Price) Master Directional Filter (Buy Only above OP, Sell Only below OP)
- MLP (Mid-Level Price) Mean-Reversion & Bounce Equilibrium Line
- KSI (K-Sentiment Indicator): Institutional 'Big Boys' Money Flow & Volume Delta
- KCX (K-Cyclical): Retail Crowd Extremes, Traps & Exhaustion Detection
- CCRY / CCYR: Algorithmic Momentum Candle Coloring (Cyan, Magenta, Yellow, Gray)
- DML: Diamond Line Multi-Rule Execution Signals
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timezone

class CraziiSystemEngine:
    def __init__(self):
        pass

    def analyze(self, candles: List[Dict[str, Any]], timeframe: str = "M15") -> Dict[str, Any]:
        """
        Runs complete CRAZII institutional evaluation on OHLC candles.
        """
        if not candles or len(candles) < 20:
            return self._empty_response()

        df = pd.DataFrame(candles).copy()
        
        # Ensure numeric types
        for col in ["open", "high", "low", "close"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        if "volume" in df.columns:
            df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0.0)
        else:
            df["volume"] = 0.0

        n = len(df)
        curr = df.iloc[-1]
        price = float(curr["close"])

        # -------------------------------------------------------------
        # 1. OP (Opening Price) Engine
        # -------------------------------------------------------------
        op_price = self._find_opening_price(df, timeframe)
        op_delta = round(price - op_price, 4)
        op_delta_pct = round((op_delta / op_price) * 100, 3) if op_price > 0 else 0.0
        
        is_above_op = price >= op_price
        op_bias = "BUY_ONLY" if is_above_op else "SELL_ONLY"
        op_badge = "▲ BUY ONLY (Above OP)" if is_above_op else "▼ SELL ONLY (Below OP)"

        # -------------------------------------------------------------
        # 2. MLP (Mid-Level Price / Mean Equilibrium Line)
        # -------------------------------------------------------------
        # 24-period or session range
        lookback = min(48, n)
        recent_high = float(df["high"].iloc[-lookback:].max())
        recent_low = float(df["low"].iloc[-lookback:].min())
        mlp_price = round((recent_high + recent_low) / 2.0, 4)
        
        mlp_delta = round(price - mlp_price, 4)
        mlp_status = "ABOVE_MLP_SUPPORT" if price >= mlp_price else "BELOW_MLP_RESISTANCE"

        # -------------------------------------------------------------
        # 3. Fast EMAs for Ribbon & Trend Alignment
        # -------------------------------------------------------------
        ema9 = df["close"].ewm(span=9, adjust=False).mean()
        ema21 = df["close"].ewm(span=21, adjust=False).mean()
        ema50 = df["close"].ewm(span=50, adjust=False).mean()
        ema200 = df["close"].ewm(span=200, adjust=False).mean()

        e9_val = float(ema9.iloc[-1])
        e21_val = float(ema21.iloc[-1])
        e50_val = float(ema50.iloc[-1])
        e200_val = float(ema200.iloc[-1])

        # -------------------------------------------------------------
        # 4. KSI (K-Sentiment Indicator — Big Boys Institutional Flow)
        # -------------------------------------------------------------
        body_deltas = df["close"] - df["open"]
        ranges = (df["high"] - df["low"]).replace(0, 0.0001)
        body_ratios = body_deltas / ranges

        # Proxy volume if provider has 0 volume
        effective_vol = df["volume"].copy()
        if effective_vol.sum() == 0:
            effective_vol = ranges * 1000.0

        signed_flows = body_ratios * effective_vol
        recent_flows = signed_flows.iloc[-14:]
        
        pos_flow = float(recent_flows[recent_flows > 0].sum())
        neg_flow = float(abs(recent_flows[recent_flows < 0].sum()))
        tot_flow = pos_flow + neg_flow

        if tot_flow > 0:
            ksi_score = round((pos_flow / tot_flow) * 100.0, 1)
        else:
            ksi_score = 50.0

        if ksi_score >= 60.0:
            ksi_state = "BIG_BOYS_ACCUMULATION"
            ksi_label = f"BIG BOYS FLOW: {ksi_score}% BUY ACCUMULATION"
            ksi_color = "#00e5ff"
        elif ksi_score <= 40.0:
            ksi_state = "BIG_BOYS_DISTRIBUTION"
            ksi_label = f"BIG BOYS FLOW: {round(100 - ksi_score, 1)}% SELL DISTRIBUTION"
            ksi_color = "#ff007f"
        else:
            ksi_state = "BALANCED_FLOW"
            ksi_label = f"BIG BOYS FLOW: {ksi_score}% NEUTRAL / BALANCED"
            ksi_color = "#94a3b8"

        # -------------------------------------------------------------
        # 5. KCX (K-Cyclical Retail Extremes & Traps)
        # -------------------------------------------------------------
        # RSI 14
        delta = df["close"].diff()
        gain = delta.clip(lower=0).ewm(alpha=1/14, adjust=False).mean()
        loss = (-delta.clip(upper=0)).ewm(alpha=1/14, adjust=False).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = (100.0 - (100.0 / (1.0 + rs))).fillna(50.0)
        curr_rsi = float(rsi.iloc[-1])

        # Bollinger Bands 20
        sma20 = df["close"].rolling(20, min_periods=5).mean()
        std20 = df["close"].rolling(20, min_periods=5).std().fillna(0.001)
        bb_upper = sma20 + (2.0 * std20)
        bb_lower = sma20 - (2.0 * std20)
        curr_bb_upper = float(bb_upper.iloc[-1])
        curr_bb_lower = float(bb_lower.iloc[-1])

        if curr_rsi >= 72.0 and price >= curr_bb_upper * 0.998:
            kcx_state = "RETAIL_TRAP_OVERBOUGHT"
            kcx_badge = "⚠️ RETAIL EXTREME: OVERBOUGHT (FOMO TRAP RISK)"
            kcx_color = "#ffea00"
        elif curr_rsi <= 28.0 and price <= curr_bb_lower * 1.002:
            kcx_state = "RETAIL_TRAP_OVERSOLD"
            kcx_badge = "⚠️ RETAIL EXTREME: OVERSOLD (PANIC TRAP RISK)"
            kcx_color = "#ffea00"
        else:
            kcx_state = "HEALTHY_FLOW"
            kcx_badge = "✓ RETAIL EXTREME: HEALTHY (NO TRAP)"
            kcx_color = "#00e676"

        # -------------------------------------------------------------
        # 6. CCRY / CCYR Candlestick Classification (For All Candles)
        # -------------------------------------------------------------
        classified_candles = []
        for i in range(n):
            c_time = int(df.at[i, "time"])
            c_open = float(df.at[i, "open"])
            c_high = float(df.at[i, "high"])
            c_low = float(df.at[i, "low"])
            c_close = float(df.at[i, "close"])
            c_vol = float(df.at[i, "volume"])
            c_e21 = float(ema21.iloc[i]) if pd.notna(ema21.iloc[i]) else c_open

            c_range = max(c_high - c_low, 0.0001)
            c_body = abs(c_close - c_open)
            upper_wick = c_high - max(c_open, c_close)
            lower_wick = min(c_open, c_close) - c_low

            # Color Rules:
            # - CYAN: Bullish Institutional momentum (Close > Open & Close > EMA21 & Close >= OP)
            # - MAGENTA: Bearish Institutional momentum (Close < Open & Close < EMA21 & Close < OP)
            # - YELLOW: Exhaustion, rejection wick, or squeeze
            # - GRAY: Chop / inside bar / low momentum
            if upper_wick / c_range > 0.55 or lower_wick / c_range > 0.55:
                color_type = "YELLOW"
                color_hex = "#ffea00"  # Reversal Warning
                desc = "Wick Rejection"
            elif c_close > c_open and c_close >= c_e21 and c_close >= op_price:
                color_type = "CYAN"
                color_hex = "#00e5ff"  # Institutional Bull
                desc = "Smart Money Bull"
            elif c_close < c_open and c_close <= c_e21 and c_close < op_price:
                color_type = "MAGENTA"
                color_hex = "#ff007f"  # Institutional Bear
                desc = "Smart Money Bear"
            elif c_body / c_range < 0.25:
                color_type = "GRAY"
                color_hex = "#64748b"  # Squeeze / Neutral
                desc = "Neutral Chop"
            elif c_close >= c_open:
                color_type = "GREEN"
                color_hex = "#00e676"
                desc = "Standard Bull"
            else:
                color_type = "RED"
                color_hex = "#ff3366"
                desc = "Standard Bear"

            classified_candles.append({
                "time": c_time,
                "open": c_open,
                "high": c_high,
                "low": c_low,
                "close": c_close,
                "volume": c_vol,
                "ccry_color": color_hex,
                "ccry_type": color_type,
                "desc": desc
            })

        # -------------------------------------------------------------
        # 7. DML (Diamond Line / Diamond Signals)
        # -------------------------------------------------------------
        # Confluence Score (0 - 100)
        crazii_score = 50
        trigger_signal = "WAIT"
        trigger_reason = "Awaiting institutional confluence"
        diamond_marker = None

        # Check Diamond BUY: OP Bullish + KSI Bullish + No Overbought Trap + Price > EMA21
        if is_above_op and ksi_score >= 55.0 and kcx_state != "RETAIL_TRAP_OVERBOUGHT" and price >= e21_val:
            crazii_score = min(98, int(ksi_score * 0.45 + (35 if price > mlp_price else 20) + 20))
            trigger_signal = "BUY_DIAMOND"
            trigger_reason = f"Institutional Buy Confluence: Price above OP ({op_price}), KSI {ksi_score}% Inflow, Healthy Retail Flow"
            diamond_marker = {
                "type": "BUY",
                "label": "◆ CRAZII BUY",
                "price": price,
                "color": "#00e5ff",
                "op": op_price,
                "mlp": mlp_price
            }
        # Check Diamond SELL: OP Bearish + KSI Bearish + No Oversold Trap + Price < EMA21
        elif (not is_above_op) and ksi_score <= 45.0 and kcx_state != "RETAIL_TRAP_OVERSOLD" and price <= e21_val:
            crazii_score = min(98, int((100 - ksi_score) * 0.45 + (35 if price < mlp_price else 20) + 20))
            trigger_signal = "SELL_DIAMOND"
            trigger_reason = f"Institutional Sell Confluence: Price below OP ({op_price}), KSI {ksi_score}% Outflow, Healthy Retail Flow"
            diamond_marker = {
                "type": "SELL",
                "label": "◆ CRAZII SELL",
                "price": price,
                "color": "#ff007f",
                "op": op_price,
                "mlp": mlp_price
            }
        else:
            crazii_score = int(ksi_score * 0.5 + 25)

        return {
            "op": {
                "price": op_price,
                "delta": op_delta,
                "delta_pct": op_delta_pct,
                "is_above": is_above_op,
                "bias": op_bias,
                "badge": op_badge
            },
            "mlp": {
                "price": mlp_price,
                "delta": mlp_delta,
                "status": mlp_status,
                "recent_high": recent_high,
                "recent_low": recent_low
            },
            "ksi": {
                "score": ksi_score,
                "state": ksi_state,
                "label": ksi_label,
                "color": ksi_color
            },
            "kcx": {
                "state": kcx_state,
                "badge": kcx_badge,
                "color": kcx_color,
                "rsi": curr_rsi
            },
            "diamond_trigger": {
                "signal": trigger_signal,
                "score": crazii_score,
                "reason": trigger_reason,
                "marker": diamond_marker
            },
            "classified_candles": classified_candles[-150:]  # Last 150 classified bars
        }

    def _find_opening_price(self, df: pd.DataFrame, timeframe: str) -> float:
        """
        Determines the opening price anchor (Daily 00:00 UTC or session start).
        """
        try:
            # If time column is unix timestamp in seconds
            timestamps = pd.to_datetime(df["time"], unit="s", utc=True)
            current_day = timestamps.iloc[-1].date()
            day_mask = timestamps.dt.date == current_day
            day_candles = df[day_mask]
            
            if len(day_candles) > 0:
                return float(day_candles.iloc[0]["open"])
        except Exception:
            pass

        # Fallback to candle 24 bars ago or first bar
        idx = max(0, len(df) - 24)
        return float(df["open"].iloc[idx])

    def _empty_response(self) -> Dict[str, Any]:
        return {
            "op": {"price": 0.0, "delta": 0.0, "delta_pct": 0.0, "is_above": True, "bias": "WAIT", "badge": "OP SYNCING"},
            "mlp": {"price": 0.0, "delta": 0.0, "status": "UNKNOWN", "recent_high": 0.0, "recent_low": 0.0},
            "ksi": {"score": 50.0, "state": "BALANCED_FLOW", "label": "BIG BOYS FLOW: NEUTRAL", "color": "#94a3b8"},
            "kcx": {"state": "HEALTHY_FLOW", "badge": "RETAIL: NORMAL", "color": "#00e676", "rsi": 50.0},
            "diamond_trigger": {"signal": "WAIT", "score": 50, "reason": "Insufficient candles", "marker": None},
            "classified_candles": []
        }

crazii_engine = CraziiSystemEngine()

