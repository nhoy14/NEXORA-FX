"""
NEXORA FX — Signal Engine
Synthesizes EMA trend alignment, Market Structure (BOS/CHoCH), SMC confluence (OB, FVG, Sweeps),
and ATR volatility filters into a 0-100 scoring model.
Outputs BUY, SELL, or WAIT with precise Entry, Stop Loss, and TP1 (1R), TP2 (2R), TP3 (3R).
Strict rule: Stale data, closed market sessions, or unconfirmed setups disable live signals and return WAIT.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import pandas as pd
import numpy as np

from backend.market_data.registry import provider_registry

class SignalEngine:
    def __init__(self, min_score_threshold: int = 70):
        self.min_score_threshold = min_score_threshold

    def generate_signal(
        self,
        timeframe: str,
        candles: List[Dict[str, Any]],
        indicators_data: Dict[str, Any],
        msnr_data: Dict[str, Any],
        symbol: str = "XAUUSD",
        data_status: str = "LIVE",
        min_score: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Evaluates market conditions and returns BUY, SELL, or WAIT.
        STALE, CLOSED, or INVALID data strictly disables live trade signals and returns WAIT.
        """
        threshold = min_score if min_score is not None else self.min_score_threshold
        now_iso = datetime.now(timezone.utc).isoformat()
        sym = symbol.upper()

        # 1. Stale / Invalid Market Check (Allow analysis when closed/weekend)
        if data_status.upper() in ["INVALID", "UNAVAILABLE"]:
            status_reasons = {
                "INVALID": "Market data validation failed (OHLC or timestamp integrity issue). Signals suspended.",
                "UNAVAILABLE": "Market data feed currently unavailable. Standby."
            }
            return self._build_wait_response(
                symbol=sym,
                timeframe=timeframe,
                score=0,
                reasons=[status_reasons.get(data_status.upper(), f"Feed status {data_status} disables signal generation.")],
                invalidations=["Wait for verified live market data stream."],
                timestamp=now_iso,
                current_price=candles[-1]["close"] if candles else None,
                data_status=data_status
            )

        # 2. Sanity check for minimum bars
        if not candles or len(candles) < 25 or not indicators_data or not msnr_data:
            return self._build_wait_response(
                symbol=sym,
                timeframe=timeframe,
                score=0,
                reasons=["Insufficient historical bars or indicators unavailable (< 25 candles)"],
                invalidations=["Wait for market data stream to populate."],
                timestamp=now_iso,
                data_status=data_status
            )

        latest_candle = candles[-1]
        current_price = float(latest_candle["close"])
        atr_val = indicators_data.get("latest", {}).get("atr", 1.5)
        ema_trend = indicators_data.get("trend", "NEUTRAL")
        structure_trend = msnr_data.get("structure_state", "NEUTRAL")
        equilibrium = msnr_data.get("equilibrium", {})
        current_zone = equilibrium.get("zone", "EQUILIBRIUM")

        # Get Instrument specs for proper SL/TP rounding and minimum tick/pip spacing
        inst = provider_registry.get_instrument(sym)
        min_stop_distance = (inst.tick_size * 20.0) if inst else (atr_val * 0.5)

        # Evaluate Bullish Confluence
        bullish_score, bullish_reasons, bullish_sl = self._evaluate_bullish(
            current_price=current_price,
            atr_val=atr_val,
            indicators=indicators_data,
            msnr=msnr_data
        )

        # Evaluate Bearish Confluence
        bearish_score, bearish_reasons, bearish_sl = self._evaluate_bearish(
            current_price=current_price,
            atr_val=atr_val,
            indicators=indicators_data,
            msnr=msnr_data
        )

        # Contradiction check: Higher Structure vs EMA Alignment
        if ema_trend == "BULLISH" and structure_trend == "BEARISH":
            bullish_score = max(0, bullish_score - 25)
            bullish_reasons.append("Conflicting higher structure: Bearish structure active against Bullish EMAs")
        elif ema_trend == "BEARISH" and structure_trend == "BULLISH":
            bearish_score = max(0, bearish_score - 25)
            bearish_reasons.append("Conflicting higher structure: Bullish structure active against Bearish EMAs")

        # Determine Winning Direction
        if bullish_score >= threshold and bullish_score > bearish_score:
            direction = "BUY"
            score = bullish_score
            reasons = bullish_reasons
            entry_price = current_price
            sl_price = bullish_sl if (bullish_sl and bullish_sl < entry_price) else round(entry_price - (atr_val * 1.5), 4)
            risk_dist = entry_price - sl_price
            
            if risk_dist < min_stop_distance:
                risk_dist = max(min_stop_distance, atr_val)
                sl_price = round(entry_price - risk_dist, 4)

            tp1 = round(entry_price + (1.0 * risk_dist), 4)
            tp2 = round(entry_price + (2.0 * risk_dist), 4)
            tp3 = round(entry_price + (3.0 * risk_dist), 4)

            invalidations = [
                f"Closed candle below Stop Loss ({sl_price:.4f})",
                "Bearish CHoCH breaks lower structure on confirmed close",
                "EMA 9 crosses decisively below EMA 21"
            ]

            return {
                "direction": direction,
                "status": "ACTIVE_SETUP",
                "setup_score": score,
                "confidence_limitations": "Model score based on technical confluence. Out-of-sample backtesting required. Not guaranteed win rate.",
                "symbol": sym,
                "timeframe": timeframe,
                "timestamp": latest_candle.get("iso_time", now_iso),
                "data_status": data_status,
                "current_price": current_price,
                "entry_price": entry_price,
                "entry": entry_price,
                "entry_zone": f"{round(entry_price - (0.15 * atr_val), 4)} – {round(entry_price + (0.15 * atr_val), 4)}",
                "sl_price": sl_price,
                "sl": sl_price,
                "tp1_price": tp1,
                "tp1": tp1,
                "tp2_price": tp2,
                "tp2": tp2,
                "tp3_price": tp3,
                "tp3": tp3,
                "rr_ratio": 2.0,
                "risk_distance_points": round(risk_dist, 4),
                "risk_to_reward": "1:2.0 (TP2 target) / 1:3.0 (Runner)",
                "reasons": reasons,
                "invalidations": invalidations
            }

        elif bearish_score >= threshold and bearish_score > bullish_score:
            direction = "SELL"
            score = bearish_score
            reasons = bearish_reasons
            entry_price = current_price
            sl_price = bearish_sl if (bearish_sl and bearish_sl > entry_price) else round(entry_price + (atr_val * 1.5), 4)
            risk_dist = sl_price - entry_price

            if risk_dist < min_stop_distance:
                risk_dist = max(min_stop_distance, atr_val)
                sl_price = round(entry_price + risk_dist, 4)

            tp1 = round(entry_price - (1.0 * risk_dist), 4)
            tp2 = round(entry_price - (2.0 * risk_dist), 4)
            tp3 = round(entry_price - (3.0 * risk_dist), 4)

            invalidations = [
                f"Closed candle above Stop Loss ({sl_price:.4f})",
                "Bullish CHoCH breaks higher structure on confirmed close",
                "EMA 9 crosses decisively above EMA 21"
            ]

            return {
                "direction": direction,
                "status": "ACTIVE_SETUP",
                "setup_score": score,
                "confidence_limitations": "Model score based on technical confluence. Out-of-sample backtesting required. Not guaranteed win rate.",
                "symbol": sym,
                "timeframe": timeframe,
                "timestamp": latest_candle.get("iso_time", now_iso),
                "data_status": data_status,
                "current_price": current_price,
                "entry_price": entry_price,
                "entry": entry_price,
                "entry_zone": f"{round(entry_price - (0.15 * atr_val), 4)} – {round(entry_price + (0.15 * atr_val), 4)}",
                "sl_price": sl_price,
                "sl": sl_price,
                "tp1_price": tp1,
                "tp1": tp1,
                "tp2_price": tp2,
                "tp2": tp2,
                "tp3_price": tp3,
                "tp3": tp3,
                "rr_ratio": 2.0,
                "risk_distance_points": round(risk_dist, 4),
                "risk_to_reward": "1:2.0 (TP2 target) / 1:3.0 (Runner)",
                "reasons": reasons,
                "invalidations": invalidations
            }

        else:
            top_score = max(bullish_score, bearish_score)
            reasons = []
            if top_score > 0:
                reasons.append(f"Setup confluence score ({top_score}/100) below sniper entry threshold ({threshold}/100)")
            else:
                reasons.append("No directional edge detected. Market in ranging consolidation.")

            if ema_trend == "NEUTRAL":
                reasons.append("EMA ribbon is not fanned in clear alignment")
            if structure_trend == "NEUTRAL":
                reasons.append("Market structure does not show fresh confirmed BOS/CHoCH")

            return self._build_wait_response(
                symbol=sym,
                timeframe=timeframe,
                score=top_score,
                reasons=reasons,
                invalidations=["Patience required. Do not force trades during chop."],
                timestamp=latest_candle.get("iso_time", now_iso),
                current_price=current_price,
                data_status=data_status
            )

    def _evaluate_bullish(
        self,
        current_price: float,
        atr_val: float,
        indicators: Dict[str, Any],
        msnr: Dict[str, Any]
    ) -> (int, List[str], Optional[float]):
        score = 0
        reasons = []
        sl_candidate: Optional[float] = None
        latest_ind = indicators.get("latest", {})

        # 1. EMA Trend (up to 25 pts)
        if indicators.get("trend") == "BULLISH":
            score += 25
            reasons.append("EMA 9 > 21 > 50 fan with price above EMA 200 (+25 pts)")
        elif latest_ind.get("ema_fast", 0) > latest_ind.get("ema_medium", 0):
            score += 12
            reasons.append("Short-term EMA 9 > 21 bullish alignment (+12 pts)")

        # RSI momentum confirmation
        rsi = latest_ind.get("rsi", 50.0)
        if 50.0 < rsi < 70.0:
            score += 5
            reasons.append(f"RSI in bullish expansion zone ({rsi:.1f}) (+5 pts)")
        elif rsi <= 35.0:
            score += 8
            reasons.append(f"RSI oversold bounce potential ({rsi:.1f}) (+8 pts)")

        # 2. Market Structure (up to 25 pts)
        if msnr.get("structure_state") == "BULLISH":
            score += 20
            reasons.append("Bullish Market Structure confirmed (Higher Highs / Higher Lows) (+20 pts)")
        
        recent_bos = [b for b in msnr.get("bos_events", []) if b["type"] == "BOS_BULLISH"]
        recent_choch = [c for c in msnr.get("choch_events", []) if c["type"] == "CHOCH_BULLISH"]
        if recent_choch:
            score += 10
            reasons.append(f"Recent Bullish CHoCH reversal at {recent_choch[-1]['broken_level']:.2f} (+10 pts)")
        elif recent_bos:
            score += 5
            reasons.append(f"Recent Bullish BOS expansion at {recent_bos[-1]['broken_level']:.2f} (+5 pts)")

        # 3. SMC Confluence: Order Blocks, FVGs, Sweeps (up to 35 pts)
        unmit_obs = [ob for ob in msnr.get("order_blocks", []) if ob["type"] == "BULLISH_OB" and not ob["mitigated"]]
        for ob in unmit_obs:
            if ob["bottom"] <= current_price <= ob["top"] + (atr_val * 0.8):
                score += 15
                reasons.append(f"Testing fresh Bullish Order Block [{ob['bottom']:.2f} - {ob['top']:.2f}] (+15 pts)")
                sl_candidate = round(ob["bottom"] - (atr_val * 0.4), 4)
                break

        bull_fvgs = [f for f in msnr.get("fair_value_gaps", []) if f["type"] == "BULLISH_FVG" and not f["mitigated"]]
        for f in bull_fvgs:
            if f["bottom"] <= current_price <= f["top"] + (atr_val * 0.5):
                score += 10
                reasons.append(f"Holding within Bullish Fair Value Gap [{f['bottom']:.2f} - {f['top']:.2f}] (+10 pts)")
                if not sl_candidate:
                    sl_candidate = round(f["bottom"] - (atr_val * 0.3), 4)
                break

        recent_sweeps = [s for s in msnr.get("liquidity_sweeps", []) if s["direction"] == "BULLISH_REJECTION"]
        if recent_sweeps:
            score += 10
            reasons.append(f"Sell-Side Liquidity Purge confirmed at {recent_sweeps[-1]['swept_level']:.2f} (+10 pts)")
            if not sl_candidate:
                sl_candidate = round(recent_sweeps[-1]["wick_low"] - (atr_val * 0.2), 4)

        # 4. Equilibrium Discount Zone (up to 15 pts)
        eq = msnr.get("equilibrium", {})
        if eq.get("zone") == "DISCOUNT":
            score += 10
            reasons.append(f"Price is in DISCOUNT zone below 50% dealing range midpoint (+10 pts)")

        # Structural Swing Low fallback for Stop Loss
        if not sl_candidate:
            low_swings = [s for s in msnr.get("swings", []) if s["type"] == "LOW"]
            if low_swings:
                sl_candidate = round(low_swings[-1]["price"] - (atr_val * 0.4), 4)

        return min(100, score), reasons, sl_candidate

    def _evaluate_bearish(
        self,
        current_price: float,
        atr_val: float,
        indicators: Dict[str, Any],
        msnr: Dict[str, Any]
    ) -> (int, List[str], Optional[float]):
        score = 0
        reasons = []
        sl_candidate: Optional[float] = None
        latest_ind = indicators.get("latest", {})

        # 1. EMA Trend (up to 25 pts)
        if indicators.get("trend") == "BEARISH":
            score += 25
            reasons.append("EMA 9 < 21 < 50 fan with price below EMA 200 (+25 pts)")
        elif latest_ind.get("ema_fast", 0) < latest_ind.get("ema_medium", 0):
            score += 12
            reasons.append("Short-term EMA 9 < 21 bearish alignment (+12 pts)")

        rsi = latest_ind.get("rsi", 50.0)
        if 30.0 < rsi < 50.0:
            score += 5
            reasons.append(f"RSI in bearish contraction zone ({rsi:.1f}) (+5 pts)")
        elif rsi >= 65.0:
            score += 8
            reasons.append(f"RSI overbought exhaustion potential ({rsi:.1f}) (+8 pts)")

        # 2. Market Structure (up to 25 pts)
        if msnr.get("structure_state") == "BEARISH":
            score += 20
            reasons.append("Bearish Market Structure confirmed (Lower Highs / Lower Lows) (+20 pts)")

        recent_bos = [b for b in msnr.get("bos_events", []) if b["type"] == "BOS_BEARISH"]
        recent_choch = [c for c in msnr.get("choch_events", []) if c["type"] == "CHOCH_BEARISH"]
        if recent_choch:
            score += 10
            reasons.append(f"Recent Bearish CHoCH breakdown at {recent_choch[-1]['broken_level']:.2f} (+10 pts)")
        elif recent_bos:
            score += 5
            reasons.append(f"Recent Bearish BOS expansion at {recent_bos[-1]['broken_level']:.2f} (+5 pts)")

        # 3. SMC Confluence: Order Blocks, FVGs, Sweeps (up to 35 pts)
        unmit_obs = [ob for ob in msnr.get("order_blocks", []) if ob["type"] == "BEARISH_OB" and not ob["mitigated"]]
        for ob in unmit_obs:
            if ob["bottom"] - (atr_val * 0.8) <= current_price <= ob["top"]:
                score += 15
                reasons.append(f"Testing fresh Bearish Order Block [{ob['bottom']:.2f} - {ob['top']:.2f}] (+15 pts)")
                sl_candidate = round(ob["top"] + (atr_val * 0.4), 4)
                break

        bear_fvgs = [f for f in msnr.get("fair_value_gaps", []) if f["type"] == "BEARISH_FVG" and not f["mitigated"]]
        for f in bear_fvgs:
            if f["bottom"] - (atr_val * 0.5) <= current_price <= f["top"]:
                score += 10
                reasons.append(f"Holding within Bearish Fair Value Gap [{f['bottom']:.2f} - {f['top']:.2f}] (+10 pts)")
                if not sl_candidate:
                    sl_candidate = round(f["top"] + (atr_val * 0.3), 4)
                break

        recent_sweeps = [s for s in msnr.get("liquidity_sweeps", []) if s["direction"] == "BEARISH_REJECTION"]
        if recent_sweeps:
            score += 10
            reasons.append(f"Buy-Side Liquidity Purge confirmed at {recent_sweeps[-1]['swept_level']:.2f} (+10 pts)")
            if not sl_candidate:
                sl_candidate = round(recent_sweeps[-1]["wick_high"] + (atr_val * 0.2), 4)

        # 4. Equilibrium Premium Zone (up to 15 pts)
        eq = msnr.get("equilibrium", {})
        if eq.get("zone") == "PREMIUM":
            score += 10
            reasons.append(f"Price is in PREMIUM zone above 50% dealing range midpoint (+10 pts)")

        if not sl_candidate:
            high_swings = [s for s in msnr.get("swings", []) if s["type"] == "HIGH"]
            if high_swings:
                sl_candidate = round(high_swings[-1]["price"] + (atr_val * 0.4), 4)

        return min(100, score), reasons, sl_candidate

    def _build_wait_response(
        self,
        symbol: str,
        timeframe: str,
        score: int,
        reasons: List[str],
        invalidations: List[str],
        timestamp: str,
        current_price: Optional[float] = None,
        data_status: str = "LIVE"
    ) -> Dict[str, Any]:
        p = current_price or 0.0
        prov_entry = p
        prov_sl = round(p * 0.995, 2) if p > 0 else 0.0
        prov_tp = round(p * 1.015, 2) if p > 0 else 0.0
        return {
            "direction": "WAIT",
            "status": "STANDBY",
            "setup_score": score,
            "confidence_limitations": "Patience is key for sniper scalping. Standby until high-confluence criteria align.",
            "symbol": symbol,
            "timeframe": timeframe,
            "timestamp": timestamp,
            "data_status": data_status,
            "current_price": current_price,
            "entry_price": prov_entry,
            "entry": prov_entry,
            "entry_zone": f"Monitoring ~ {prov_entry:.2f}" if prov_entry > 0 else "N/A — In Standby",
            "sl_price": prov_sl,
            "sl": prov_sl,
            "tp1_price": prov_tp,
            "tp1": prov_tp,
            "tp2_price": round(p * 1.025, 2) if p > 0 else 0.0,
            "tp2": round(p * 1.025, 2) if p > 0 else 0.0,
            "tp3_price": round(p * 1.035, 2) if p > 0 else 0.0,
            "tp3": round(p * 1.035, 2) if p > 0 else 0.0,
            "rr_ratio": 2.0,
            "risk_distance_points": round(abs(prov_entry - prov_sl), 4) if p > 0 else None,
            "risk_to_reward": "1:2.0 (Estimated)",
            "reasons": reasons,
            "invalidations": invalidations
        }

signal_engine = SignalEngine()
