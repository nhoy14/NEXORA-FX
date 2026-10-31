"""
NEXORA FX — MSNR and SMC (Smart Money Concepts) Analysis Engine
Modular rule-based detection with zero look-ahead bias:
- Swing Highs & Lows (Fractals with strict right-confirmation delay)
- Break of Structure (BOS)
- Change of Character (CHoCH)
- Liquidity Sweeps (Wick manipulation & body rejection)
- Equal Highs (EQH) and Equal Lows (EQL)
- Order Blocks (Bullish/Bearish with mitigation tracking)
- Fair Value Gaps (FVG with imbalance measurement)
- 50% Equilibrium (Discount vs Premium dealing range)
- Support & Resistance clustering
"""

from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

class MSNR_SMC_Analyzer:
    def __init__(
        self,
        swing_left: int = 3,
        swing_right: int = 2,
        atr_period: int = 14,
        fvg_min_points: float = 0.5,
        eq_tolerance_atr_mult: float = 0.20
    ):
        self.swing_left = swing_left
        self.swing_right = swing_right
        self.atr_period = atr_period
        self.fvg_min_points = fvg_min_points
        self.eq_tolerance_atr_mult = eq_tolerance_atr_mult

    def analyze(self, candles: List[Dict[str, Any]], atr_val: Optional[float] = None) -> Dict[str, Any]:
        """
        Runs comprehensive SMC & MSNR detection across provided candle series.
        Strictly prevents look-ahead bias: bar at index i only considers bars <= i for confirmation.
        """
        if not candles or len(candles) < 25:
            return {
                "swings": [],
                "structure_state": "INSUFFICIENT_DATA",
                "bos_events": [],
                "choch_events": [],
                "liquidity_sweeps": [],
                "equal_levels": [],
                "order_blocks": [],
                "fair_value_gaps": [],
                "equilibrium": {},
                "support_resistance": []
            }

        df = pd.DataFrame(candles)
        n = len(df)

        # 1. Calculate ATR for dynamic thresholding if not provided
        if atr_val is None or atr_val <= 0:
            high = df["high"]
            low = df["low"]
            close = df["close"]
            prev_close = close.shift(1)
            tr = pd.concat([high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1).max(axis=1)
            atr_val = float(tr.ewm(alpha=1.0 / self.atr_period, adjust=False).mean().iloc[-1])
            if np.isnan(atr_val) or atr_val <= 0:
                atr_val = 1.5

        # 2. Detect Swing Highs and Swing Lows (Fractals)
        # Note: A bar at index i can only be confirmed as a swing after `self.swing_right` bars have closed.
        # Max index that can be confirmed is n - 1 - self.swing_right.
        swings = []
        max_evaluable_idx = n - 1 - self.swing_right

        for i in range(self.swing_left, max_evaluable_idx + 1):
            h_curr = float(df.at[i, "high"])
            l_curr = float(df.at[i, "low"])
            
            # Check swing high
            is_high = True
            for offset in range(1, self.swing_left + 1):
                if df.at[i - offset, "high"] >= h_curr:
                    is_high = False
                    break
            if is_high:
                for offset in range(1, self.swing_right + 1):
                    if df.at[i + offset, "high"] >= h_curr:
                        is_high = False
                        break

            # Check swing low
            is_low = True
            for offset in range(1, self.swing_left + 1):
                if df.at[i - offset, "low"] <= l_curr:
                    is_low = False
                    break
            if is_low:
                for offset in range(1, self.swing_right + 1):
                    if df.at[i + offset, "low"] <= l_curr:
                        is_low = False
                        break

            if is_high:
                swings.append({
                    "type": "HIGH",
                    "index": i,
                    "time": int(df.at[i, "time"]),
                    "price": round(h_curr, 2),
                    "confirmed_at_index": i + self.swing_right
                })
            elif is_low:
                swings.append({
                    "type": "LOW",
                    "index": i,
                    "time": int(df.at[i, "time"]),
                    "price": round(l_curr, 2),
                    "confirmed_at_index": i + self.swing_right
                })

        # 3. Structural State: Chronological BOS & CHoCH Detection
        bos_events = []
        choch_events = []
        current_trend = "NEUTRAL"
        last_high: Optional[Dict[str, Any]] = None
        last_low: Optional[Dict[str, Any]] = None

        # Sort swings chronologically
        swings.sort(key=lambda x: x["index"])

        # Track swings as they become confirmed in real time
        for bar_idx in range(n):
            c_bar = df.iloc[bar_idx]
            close_p = float(c_bar["close"])
            high_p = float(c_bar["high"])
            low_p = float(c_bar["low"])
            bar_time = int(c_bar["time"])

            # Check newly confirmed swings at bar_idx
            newly_confirmed = [s for s in swings if s["confirmed_at_index"] == bar_idx]
            for ns in newly_confirmed:
                if ns["type"] == "HIGH":
                    last_high = ns
                elif ns["type"] == "LOW":
                    last_low = ns

            # Evaluate structure break with closed candles
            if last_high and close_p > last_high["price"]:
                # Broke above confirmed swing high
                if current_trend == "BULLISH":
                    bos_events.append({
                        "type": "BOS_BULLISH",
                        "index": bar_idx,
                        "time": bar_time,
                        "broken_level": last_high["price"],
                        "close_price": round(close_p, 2),
                        "label": "Bullish BOS"
                    })
                else:
                    # Previous trend was BEARISH or NEUTRAL -> CHoCH
                    choch_events.append({
                        "type": "CHOCH_BULLISH",
                        "index": bar_idx,
                        "time": bar_time,
                        "broken_level": last_high["price"],
                        "close_price": round(close_p, 2),
                        "label": "Bullish CHoCH (Shift to Bullish)"
                    })
                    current_trend = "BULLISH"
                last_high = None  # Consume level so it doesn't trigger continuously

            elif last_low and close_p < last_low["price"]:
                # Broke below confirmed swing low
                if current_trend == "BEARISH":
                    bos_events.append({
                        "type": "BOS_BEARISH",
                        "index": bar_idx,
                        "time": bar_time,
                        "broken_level": last_low["price"],
                        "close_price": round(close_p, 2),
                        "label": "Bearish BOS"
                    })
                else:
                    # Previous trend was BULLISH or NEUTRAL -> CHoCH
                    choch_events.append({
                        "type": "CHOCH_BEARISH",
                        "index": bar_idx,
                        "time": bar_time,
                        "broken_level": last_low["price"],
                        "close_price": round(close_p, 2),
                        "label": "Bearish CHoCH (Shift to Bearish)"
                    })
                    current_trend = "BEARISH"
                last_low = None

        # 4. Liquidity Sweeps
        # Wick breaks swing level, but body closes inside
        liquidity_sweeps = []
        for s in swings:
            s_price = s["price"]
            s_type = s["type"]
            conf_idx = s["confirmed_at_index"]

            # Look at bars after confirmation
            for k in range(conf_idx + 1, min(conf_idx + 40, n)):
                b = df.iloc[k]
                o_k = float(b["open"])
                c_k = float(b["close"])
                h_k = float(b["high"])
                l_k = float(b["low"])

                if s_type == "HIGH":
                    # Wick pierced above, but closed below
                    if h_k > s_price and max(o_k, c_k) < s_price:
                        liquidity_sweeps.append({
                            "type": "SWEEP_HIGH",
                            "index": k,
                            "time": int(b["time"]),
                            "swept_level": s_price,
                            "wick_high": round(h_k, 2),
                            "close_price": round(c_k, 2),
                            "direction": "BEARISH_REJECTION",
                            "label": f"Buy-side Liquidity Grab at {s_price:.2f}"
                        })
                        break
                    elif c_k > s_price:
                        # Full structural break instead of sweep
                        break

                elif s_type == "LOW":
                    # Wick pierced below, but closed above
                    if l_k < s_price and min(o_k, c_k) > s_price:
                        liquidity_sweeps.append({
                            "type": "SWEEP_LOW",
                            "index": k,
                            "time": int(b["time"]),
                            "swept_level": s_price,
                            "wick_low": round(l_k, 2),
                            "close_price": round(c_k, 2),
                            "direction": "BULLISH_REJECTION",
                            "label": f"Sell-side Liquidity Grab at {s_price:.2f}"
                        })
                        break
                    elif c_k < s_price:
                        break

        # 5. Equal Highs (EQH) and Equal Lows (EQL)
        equal_levels = []
        eq_tol = atr_val * self.eq_tolerance_atr_mult

        high_swings = [s for s in swings if s["type"] == "HIGH"]
        for i in range(len(high_swings)):
            for j in range(i + 1, len(high_swings)):
                if abs(high_swings[i]["price"] - high_swings[j]["price"]) <= eq_tol:
                    equal_levels.append({
                        "type": "EQH",
                        "level": round((high_swings[i]["price"] + high_swings[j]["price"]) / 2.0, 2),
                        "indices": [high_swings[i]["index"], high_swings[j]["index"]],
                        "times": [high_swings[i]["time"], high_swings[j]["time"]],
                        "label": "Equal Highs (Resting Buy-Side Liquidity Pool)"
                    })

        low_swings = [s for s in swings if s["type"] == "LOW"]
        for i in range(len(low_swings)):
            for j in range(i + 1, len(low_swings)):
                if abs(low_swings[i]["price"] - low_swings[j]["price"]) <= eq_tol:
                    equal_levels.append({
                        "type": "EQL",
                        "level": round((low_swings[i]["price"] + low_swings[j]["price"]) / 2.0, 2),
                        "indices": [low_swings[i]["index"], low_swings[j]["index"]],
                        "times": [low_swings[i]["time"], low_swings[j]["time"]],
                        "label": "Equal Lows (Resting Sell-Side Liquidity Pool)"
                    })

        # 6. Fair Value Gaps (FVG)
        fair_value_gaps = []
        for i in range(2, n):
            c_prev2 = df.iloc[i - 2]
            c_curr = df.iloc[i]

            # Bullish FVG: Low of candle i > High of candle i-2
            if float(c_curr["low"]) > float(c_prev2["high"]):
                gap_size = float(c_curr["low"]) - float(c_prev2["high"])
                if gap_size >= max(self.fvg_min_points, atr_val * 0.25):
                    top = round(float(c_curr["low"]), 2)
                    bottom = round(float(c_prev2["high"]), 2)
                    # Check mitigation in subsequent candles
                    mitigated = False
                    for k in range(i + 1, n):
                        if float(df.iloc[k]["low"]) <= bottom:
                            mitigated = True
                            break
                    fair_value_gaps.append({
                        "type": "BULLISH_FVG",
                        "index": i,
                        "time": int(c_curr["time"]),
                        "top": top,
                        "bottom": bottom,
                        "midpoint": round((top + bottom) / 2.0, 2),
                        "size": round(gap_size, 2),
                        "mitigated": mitigated
                    })

            # Bearish FVG: High of candle i < Low of candle i-2
            elif float(c_curr["high"]) < float(c_prev2["low"]):
                gap_size = float(c_prev2["low"]) - float(c_curr["high"])
                if gap_size >= max(self.fvg_min_points, atr_val * 0.25):
                    top = round(float(c_prev2["low"]), 2)
                    bottom = round(float(c_curr["high"]), 2)
                    mitigated = False
                    for k in range(i + 1, n):
                        if float(df.iloc[k]["high"]) >= top:
                            mitigated = True
                            break
                    fair_value_gaps.append({
                        "type": "BEARISH_FVG",
                        "index": i,
                        "time": int(c_curr["time"]),
                        "top": top,
                        "bottom": bottom,
                        "midpoint": round((top + bottom) / 2.0, 2),
                        "size": round(gap_size, 2),
                        "mitigated": mitigated
                    })

        # 7. Order Blocks (OB)
        # Bullish OB: Last down candle before strong impulse that broke structure or created FVG
        # Bearish OB: Last up candle before strong impulse that broke structure or created FVG
        order_blocks = []
        for i in range(1, n - 2):
            c_ob = df.iloc[i]
            c_next = df.iloc[i + 1]
            c_next2 = df.iloc[i + 2]

            ob_open = float(c_ob["open"])
            ob_close = float(c_ob["close"])
            ob_high = float(c_ob["high"])
            ob_low = float(c_ob["low"])

            # Check Bullish OB: Bearish candle followed by strong bullish expansion
            if ob_close < ob_open:
                impulse_size = float(c_next2["close"]) - ob_low
                if impulse_size >= atr_val * 1.5 and float(c_next["close"]) > ob_high:
                    # Check mitigation
                    mitigated = False
                    for k in range(i + 3, n):
                        if float(df.iloc[k]["low"]) < ob_low:
                            mitigated = True
                            break
                    order_blocks.append({
                        "type": "BULLISH_OB",
                        "index": i,
                        "time": int(c_ob["time"]),
                        "top": round(ob_high, 2),
                        "bottom": round(ob_low, 2),
                        "midpoint": round((ob_high + ob_low) / 2.0, 2),
                        "mitigated": mitigated
                    })

            # Check Bearish OB: Bullish candle followed by strong bearish expansion
            elif ob_close > ob_open:
                impulse_size = ob_high - float(c_next2["close"])
                if impulse_size >= atr_val * 1.5 and float(c_next["close"]) < ob_low:
                    mitigated = False
                    for k in range(i + 3, n):
                        if float(df.iloc[k]["high"]) > ob_high:
                            mitigated = True
                            break
                    order_blocks.append({
                        "type": "BEARISH_OB",
                        "index": i,
                        "time": int(c_ob["time"]),
                        "top": round(ob_high, 2),
                        "bottom": round(ob_low, 2),
                        "midpoint": round((ob_high + ob_low) / 2.0, 2),
                        "mitigated": mitigated
                    })

        # 8. 50% Equilibrium (Discount vs Premium)
        recent_swings = swings[-10:] if swings else []
        highs = [s["price"] for s in recent_swings if s["type"] == "HIGH"]
        lows = [s["price"] for s in recent_swings if s["type"] == "LOW"]

        if highs and lows:
            range_high = max(highs)
            range_low = min(lows)
            midpoint = (range_high + range_low) / 2.0
            latest_price = float(df.iloc[-1]["close"])
            current_zone = "DISCOUNT" if latest_price < midpoint else "PREMIUM"
            equilibrium = {
                "range_high": round(range_high, 2),
                "range_low": round(range_low, 2),
                "midpoint_50": round(midpoint, 2),
                "latest_price": round(latest_price, 2),
                "zone": current_zone,
                "label": f"Price is in {current_zone} Zone (Midpoint: {midpoint:.2f})"
            }
        else:
            equilibrium = {
                "range_high": float(df["high"].max()),
                "range_low": float(df["low"].min()),
                "midpoint_50": round((float(df["high"].max()) + float(df["low"].min())) / 2.0, 2),
                "latest_price": round(float(df.iloc[-1]["close"]), 2),
                "zone": "EQUILIBRIUM",
                "label": "Dealing range establishing"
            }

        # 9. Support and Resistance Clustering
        sr_levels = self._cluster_support_resistance(swings, atr_val)

        # 10. MSNR Patterns: Classic A, Classic V, OC Levels, SBR, RBS, BSL, SSL
        msnr_patterns = self._detect_msnr_patterns(df, swings, sr_levels, atr_val)

        return {
            "structure_state": current_trend,
            "swings": swings[-15:],
            "bos_events": bos_events[-10:],
            "choch_events": choch_events[-5:],
            "liquidity_sweeps": liquidity_sweeps[-8:],
            "equal_levels": equal_levels[-6:],
            "order_blocks": order_blocks[-8:],
            "fair_value_gaps": fair_value_gaps[-8:],
            "equilibrium": equilibrium,
            "support_resistance": sr_levels,
            "classic_a": msnr_patterns.get("classic_a", []),
            "classic_v": msnr_patterns.get("classic_v", []),
            "oc_levels": msnr_patterns.get("oc_levels", []),
            "sbr_levels": msnr_patterns.get("sbr_levels", []),
            "rbs_levels": msnr_patterns.get("rbs_levels", []),
            "bsl_levels": msnr_patterns.get("bsl_levels", []),
            "ssl_levels": msnr_patterns.get("ssl_levels", []),
            "msnr_summary": msnr_patterns.get("summary", {})
        }

    def _detect_msnr_patterns(
        self,
        df: pd.DataFrame,
        swings: List[Dict[str, Any]],
        sr_levels: List[Dict[str, Any]],
        atr_val: float
    ) -> Dict[str, Any]:
        """Detects Classic A/V formations, OC levels, SBR/RBS flips, and BSL/SSL pools."""
        n = len(df)
        if n < 15:
            return {}

        latest_price = float(df.iloc[-1]["close"])

        # Classic A (Apex resistance rejection) & Classic V (Valley support bounce)
        classic_a = []
        classic_v = []
        for s in swings[-8:]:
            idx = s["index"]
            if idx > 1 and idx < n - 2:
                # Check sharpness
                prev_bar = df.iloc[idx - 1]
                next_bar = df.iloc[idx + 1]
                if s["type"] == "HIGH":
                    rise = float(df.at[idx, "high"]) - float(prev_bar["low"])
                    drop = float(df.at[idx, "high"]) - float(next_bar["low"])
                    if rise >= atr_val * 0.8 and drop >= atr_val * 0.8:
                        classic_a.append({
                            "type": "CLASSIC_A",
                            "index": idx,
                            "time": s["time"],
                            "apex_price": s["price"],
                            "label": f"Classic A Apex Rejection at {s['price']:.2f}",
                            "status": "RESISTANCE"
                        })
                elif s["type"] == "LOW":
                    drop = float(prev_bar["high"]) - float(df.at[idx, "low"])
                    rally = float(next_bar["high"]) - float(df.at[idx, "low"])
                    if drop >= atr_val * 0.8 and rally >= atr_val * 0.8:
                        classic_v.append({
                            "type": "CLASSIC_V",
                            "index": idx,
                            "time": s["time"],
                            "valley_price": s["price"],
                            "label": f"Classic V Valley Bounce at {s['price']:.2f}",
                            "status": "SUPPORT"
                        })

        # Open-Close (OC) Levels: Cluster of candle bodies
        body_levels = []
        for k in range(max(0, n - 40), n):
            body_levels.append(float(df.iloc[k]["open"]))
            body_levels.append(float(df.iloc[k]["close"]))
        
        body_levels.sort()
        oc_clusters = []
        if body_levels:
            curr_c = [body_levels[0]]
            tol = atr_val * 0.20
            for p in body_levels[1:]:
                if p - curr_c[-1] <= tol:
                    curr_c.append(p)
                else:
                    if len(curr_c) >= 4:
                        oc_clusters.append(round(sum(curr_c) / len(curr_c), 2))
                    curr_c = [p]
            if len(curr_c) >= 4:
                oc_clusters.append(round(sum(curr_c) / len(curr_c), 2))

        oc_levels = [{"price": p, "label": f"Institutional OC Body Line at {p:.2f}"} for p in oc_clusters[-5:]]

        # SBR (Support Becomes Resistance) & RBS (Resistance Becomes Support)
        sbr_levels = []
        rbs_levels = []
        for sr in sr_levels:
            lvl = sr["price"]
            # SBR: was support (price was above), now price broke below and retests from beneath
            if latest_price < lvl and abs(latest_price - lvl) <= atr_val * 2.0:
                sbr_levels.append({
                    "level": lvl,
                    "type": "SBR",
                    "label": f"SBR Flip: Support became Resistance at {lvl:.2f}",
                    "distance": round(lvl - latest_price, 2)
                })
            # RBS: was resistance (price was below), now price broke above and retests from top
            elif latest_price > lvl and abs(latest_price - lvl) <= atr_val * 2.0:
                rbs_levels.append({
                    "level": lvl,
                    "type": "RBS",
                    "label": f"RBS Flip: Resistance became Support at {lvl:.2f}",
                    "distance": round(latest_price - lvl, 2)
                })

        # Buy-Side Liquidity (BSL) above recent highs, Sell-Side Liquidity (SSL) below recent lows
        high_prices = [s["price"] for s in swings if s["type"] == "HIGH"]
        low_prices = [s["price"] for s in swings if s["type"] == "LOW"]

        bsl_levels = [
            {"price": p, "type": "BSL", "label": f"BSL Resting Buy Stops at {p:.2f}"}
            for p in sorted(high_prices, reverse=True)[:4]
        ]
        ssl_levels = [
            {"price": p, "type": "SSL", "label": f"SSL Resting Sell Stops at {p:.2f}"}
            for p in sorted(low_prices)[:4]
        ]

        summary = {
            "classic_a_count": len(classic_a),
            "classic_v_count": len(classic_v),
            "oc_levels_count": len(oc_levels),
            "sbr_active": len(sbr_levels) > 0,
            "rbs_active": len(rbs_levels) > 0,
            "nearest_bsl": bsl_levels[0]["price"] if bsl_levels else None,
            "nearest_ssl": ssl_levels[0]["price"] if ssl_levels else None,
        }

        return {
            "classic_a": classic_a,
            "classic_v": classic_v,
            "oc_levels": oc_levels,
            "sbr_levels": sbr_levels,
            "rbs_levels": rbs_levels,
            "bsl_levels": bsl_levels,
            "ssl_levels": ssl_levels,
            "summary": summary
        }

    def _cluster_support_resistance(self, swings: List[Dict[str, Any]], atr_val: float) -> List[Dict[str, Any]]:
        """Clusters swing points within ATR distance to find key horizontal levels."""
        if not swings:
            return []

        cluster_dist = atr_val * 0.45
        prices = [s["price"] for s in swings]
        prices.sort()

        clusters = []
        current_cluster = [prices[0]]

        for p in prices[1:]:
            if p - current_cluster[-1] <= cluster_dist:
                current_cluster.append(p)
            else:
                clusters.append(current_cluster)
                current_cluster = [p]
        clusters.append(current_cluster)

        sr_levels = []
        for c in clusters:
            avg_price = round(sum(c) / len(c), 2)
            touches = len(c)
            strength = "KEY" if touches >= 3 else ("MAJOR" if touches == 2 else "MINOR")
            sr_levels.append({
                "price": avg_price,
                "touches": touches,
                "strength": strength,
                "type": "SUPPORT_RESISTANCE"
            })

        sr_levels.sort(key=lambda x: x["price"], reverse=True)
        return sr_levels

# Global analyzer instance
msnr_smc_analyzer = MSNR_SMC_Analyzer()
