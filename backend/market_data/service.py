"""
NEXORA FX — Unified Market Data Service
Orchestrates multi-market routing, intelligent provider fallback, rate-limit defense,
and TTL caching. Never fabricates prices.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from backend.market_data.base import (
    Quote,
    CandleSeries,
    DataStatus,
    AssetClass
)
from backend.market_data.registry import provider_registry, ProviderRegistry

logger = logging.getLogger("nexora.service")

class MarketDataService:
    def __init__(self, registry: Optional[ProviderRegistry] = None):
        self.registry = registry or provider_registry
        self._quote_cache: Dict[str, Dict[str, Any]] = {}
        self._candle_cache: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        self._quote_ttl = 5     # 5 seconds cache for live quotes
        self._candle_ttl = 15   # 15 seconds cache for candles
        self._default_provider = "auto"

    def set_default_provider(self, provider_id: str):
        self._default_provider = provider_id.lower()
        self._quote_cache.clear()
        self._candle_cache.clear()
        logger.info(f"MarketDataService default provider set to: {self._default_provider}")

    def get_default_provider(self) -> str:
        return self._default_provider

    def _determine_provider_chain(self, symbol: str, requested_provider: Optional[str] = None) -> List[str]:
        """Calculates prioritized provider chain based on asset class and connectivity."""
        if requested_provider and requested_provider.lower() != "auto":
            req = requested_provider.lower()
            return [req]

        inst = self.registry.get_instrument(symbol)
        asset_cls = inst.asset_class if inst else AssetClass.FOREX

        # Prioritization rules
        if asset_cls == AssetClass.METALS:
            return ["mt5", "xaus", "binance", "yahoo"]
        elif asset_cls == AssetClass.CRYPTO:
            return ["binance", "mt5", "kraken", "yahoo"]
        elif asset_cls == AssetClass.FOREX:
            return ["mt5", "yahoo", "twelve_data"]
        elif asset_cls == AssetClass.INDICES:
            return ["mt5", "yahoo"]
        elif asset_cls == AssetClass.COMMODITIES:
            return ["mt5", "yahoo"]
        elif asset_cls == AssetClass.STOCKS:
            return ["yahoo", "mt5", "twelve_data"]
        else:
            return ["yahoo", "mt5"]

    def get_quote(self, symbol: str, provider: Optional[str] = None) -> Optional[Quote]:
        """Fetches latest quote for symbol across prioritized providers with TTL caching."""
        sym = symbol.upper()
        now_ts = time.time()
        cache_key = f"{sym}_{provider or self._default_provider}"

        if cache_key in self._quote_cache:
            entry = self._quote_cache[cache_key]
            if now_ts - entry["timestamp"] < self._quote_ttl:
                return entry["quote"]

        chain = self._determine_provider_chain(sym, provider or self._default_provider)
        for pid in chain:
            prov = self.registry.get_provider(pid)
            if not prov:
                continue

            try:
                quote = prov.get_quote(sym)
                if quote is not None:
                    self._quote_cache[cache_key] = {"timestamp": now_ts, "quote": quote}
                    return quote
            except Exception as e:
                logger.debug(f"Provider {pid} quote failed for {sym}: {e}")

        return None

    def get_candles(
        self,
        symbol: str,
        timeframe: str = "H1",
        limit: int = 200,
        provider: Optional[str] = None
    ) -> Optional[CandleSeries]:
        """Fetches verified OHLC candles for symbol across prioritized providers."""
        sym = symbol.upper()
        tf = timeframe.upper()
        prov_key = provider or self._default_provider
        cache_key = (sym, tf, prov_key)
        now_ts = time.time()

        if cache_key in self._candle_cache:
            entry = self._candle_cache[cache_key]
            if now_ts - entry["timestamp"] < self._candle_ttl:
                return entry["series"]

        chain = self._determine_provider_chain(sym, prov_key)
        for pid in chain:
            prov = self.registry.get_provider(pid)
            if not prov:
                continue

            try:
                series = prov.get_candles(sym, timeframe=tf, limit=limit)
                if series is not None and series.candles and len(series.candles) >= 3:
                    self._candle_cache[cache_key] = {"timestamp": now_ts, "series": series}
                    return series
            except Exception as e:
                logger.debug(f"Provider {pid} candles failed for {sym}: {e}")

        return None

    def get_system_health(self) -> Dict[str, Any]:
        """Returns consolidated health report of all providers and server status."""
        statuses = self.registry.get_provider_statuses()
        connected_count = len([s for s in statuses if s["is_live"]])
        return {
            "service": "NEXORA FX Market Data Pipeline",
            "server_time_utc": datetime.now(timezone.utc).isoformat(),
            "default_provider": self._default_provider,
            "connected_providers": connected_count,
            "total_providers": len(statuses),
            "providers": statuses
        }

market_data_service = MarketDataService()
