"""
NEXORA FX — Fast Concurrent Market Scanner Engine
High-performance multi-market screener across Forex, Metals, Crypto, Indices, Stocks, Commodities.
Runs concurrent multi-worker queries using ThreadPoolExecutor for lightning-fast responsiveness.
Evaluates EMA alignment, RSI, Breakouts, BOS/CHoCH, Liquidity Sweeps, and Sniper Signals.
Never fabricates data. Uses caching to respect provider rate limits.
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

from backend.market_data.registry import provider_registry
from backend.market_data.service import market_data_service
from backend.indicators import compute_indicators
from backend.msnr_smc import msnr_smc_analyzer
from backend.signal_engine import signal_engine

logger = logging.getLogger("nexora.scanner")

class MarketScanner:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 25  # 25 seconds cache for scanner results

    def _scan_single_instrument(self, inst, provider: Optional[str], timeframe: str) -> Optional[Dict[str, Any]]:
        sym = inst.symbol
        if provider and provider != "auto":
            p = provider_registry.get_provider(provider)
            if not p or not p.supports_symbol(sym):
                return None

        try:
            series = market_data_service.get_candles(
                symbol=sym,
                timeframe=timeframe,
                limit=60,
                provider=provider
            )

            if not series or not series.candles or len(series.candles) < 20:
                return {
                    "symbol": sym,
                    "name": inst.name,
                    "asset_class": inst.asset_class.value,
                    "provider": series.provider if series else "None",
                    "price": None,
                    "data_status": "UNAVAILABLE",
                    "is_live": False,
                    "ema_trend": "UNKNOWN",
                    "rsi": None,
                    "structure_state": "UNKNOWN",
                    "bos_choch": "None",
                    "liquidity_sweep": False,
                    "signal_direction": "WAIT",
                    "setup_score": 0,
                    "entry_price": None,
                    "sl_price": None,
                    "tp1_price": None,
                    "risk_to_reward": "N/A"
                }

            candle_dicts = [c.model_dump() for c in series.candles]
            latest_p = candle_dicts[-1]["close"]
            status_str = series.status.value

            # Indicators
            ind_res = compute_indicators(candle_dicts)
            atr_val = ind_res.get("latest", {}).get("atr", 1.5)
            rsi_val = ind_res.get("latest", {}).get("rsi")
            ema_trend = ind_res.get("trend", "NEUTRAL")

            # SMC Structure
            smc_res = msnr_smc_analyzer.analyze(candle_dicts, atr_val=atr_val)
            struct_state = smc_res.get("structure_state", "NEUTRAL")

            recent_choch = smc_res.get("choch_events", [])
            recent_bos = smc_res.get("bos_events", [])
            bos_choch_label = "None"
            if recent_choch:
                bos_choch_label = recent_choch[-1]["type"]
            elif recent_bos:
                bos_choch_label = recent_bos[-1]["type"]

            sweeps = smc_res.get("liquidity_sweeps", [])
            has_recent_sweep = len(sweeps) > 0

            # Signal
            sig_res = signal_engine.generate_signal(
                timeframe=timeframe,
                candles=candle_dicts,
                indicators_data=ind_res,
                msnr_data=smc_res,
                symbol=sym,
                data_status=status_str
            )

            return {
                "symbol": sym,
                "name": inst.name,
                "asset_class": inst.asset_class.value,
                "provider": series.provider,
                "price": latest_p,
                "data_status": status_str,
                "is_live": series.is_live,
                "delay_info": series.delay_info,
                "ema_trend": ema_trend,
                "rsi": rsi_val,
                "structure_state": struct_state,
                "bos_choch": bos_choch_label,
                "liquidity_sweep": has_recent_sweep,
                "signal_direction": sig_res["direction"],
                "setup_score": sig_res["setup_score"],
                "entry_price": sig_res.get("entry_price"),
                "sl_price": sig_res.get("sl_price"),
                "tp1_price": sig_res.get("tp1_price"),
                "risk_to_reward": sig_res.get("risk_to_reward", "N/A"),
                "key_reason": sig_res["reasons"][0] if sig_res.get("reasons") else ""
            }
        except Exception as e:
            logger.debug(f"Scanner item {sym} error: {e}")
            return None

    def scan_markets(
        self,
        asset_class: Optional[str] = None,
        provider: Optional[str] = None,
        timeframe: str = "H1",
        direction_filter: Optional[str] = None,
        min_score: int = 0,
        rsi_condition: Optional[str] = None,
        has_bos_choch: Optional[bool] = None,
        has_sweep: Optional[bool] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Runs concurrent technical scan across candidate instruments.
        """
        cache_key = f"{asset_class}_{provider}_{timeframe}"
        now_ts = time.time()

        raw_results = []
        if cache_key in self._cache and (now_ts - self._cache[cache_key]["timestamp"] < self._cache_ttl):
            raw_results = self._cache[cache_key]["results"]
        else:
            instruments = provider_registry.list_instruments()
            if asset_class:
                ac_clean = asset_class.upper()
                instruments = [i for i in instruments if i.asset_class.value == ac_clean]

            # Run concurrently across up to 8 threads
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = {
                    executor.submit(self._scan_single_instrument, inst, provider, timeframe): inst
                    for inst in instruments
                }
                for f in as_completed(futures):
                    res = f.result()
                    if res is not None:
                        raw_results.append(res)

            # Update cache
            self._cache[cache_key] = {"timestamp": now_ts, "results": raw_results}

        # Apply filters
        filtered = list(raw_results)

        if direction_filter:
            d_clean = direction_filter.upper()
            filtered = [r for r in filtered if r["signal_direction"] == d_clean]

        if min_score > 0:
            filtered = [r for r in filtered if r["setup_score"] >= min_score]

        if rsi_condition:
            rc = rsi_condition.lower()
            if rc == "oversold":
                filtered = [r for r in filtered if r["rsi"] is not None and r["rsi"] <= 35.0]
            elif rc == "overbought":
                filtered = [r for r in filtered if r["rsi"] is not None and r["rsi"] >= 65.0]

        if has_bos_choch is True:
            filtered = [r for r in filtered if r["bos_choch"] != "None"]

        if has_sweep is True:
            filtered = [r for r in filtered if r["liquidity_sweep"]]

        filtered.sort(key=lambda x: (x["setup_score"], 1 if x["price"] is not None else 0), reverse=True)

        return {
            "timeframe": timeframe,
            "total_scanned": len(raw_results),
            "total_matches": len(filtered),
            "filters_applied": {
                "asset_class": asset_class,
                "provider": provider,
                "direction": direction_filter,
                "min_score": min_score,
                "rsi_condition": rsi_condition
            },
            "candidates": filtered[:limit]
        }

market_scanner = MarketScanner()
