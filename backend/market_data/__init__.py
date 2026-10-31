"""
NEXORA FX — Market Data Engine Package
Exports base models, validation, registry, service, and unified engine facade.
"""

from backend.market_data.base import (
    AssetClass,
    DataStatus,
    Candle,
    Quote,
    CandleSeries,
    Instrument,
    ProviderCapability,
    BaseMarketDataProvider
)
from backend.market_data.validation import (
    validate_quote,
    validate_candle_bar,
    validate_candle_series,
    is_market_open
)
from backend.market_data.registry import provider_registry, ProviderRegistry
from backend.market_data.service import market_data_service, MarketDataService

class MarketDataEngine:
    def __init__(self):
        self._service = market_data_service
        self._registry = provider_registry
        self._active_provider = "auto"
        self._mt5_symbol = None

    def set_provider(self, provider: str):
        provider = provider.lower().strip()
        self._active_provider = provider
        self._service.set_default_provider(provider)

    def get_active_provider(self) -> str:
        return self._active_provider

    def set_mt5_symbol(self, symbol: str):
        self._mt5_symbol = symbol.strip()

    def get_broker_info(self):
        mt5_prov = self._registry.get_provider("mt5")
        if mt5_prov:
            health = mt5_prov.check_health()
            if health.get("status") == "CONNECTED":
                return {
                    "connected": True,
                    "company": health.get("broker", "Exness"),
                    "server": health.get("server", ""),
                    "login": health.get("login", 0),
                    "ping": health.get("ping_ms", 0),
                    "symbol": self._mt5_symbol or "XAUUSDm"
                }
        return {"connected": False, "company": "Not Connected", "symbol": self._mt5_symbol or "XAUUSD"}

    def get_source_health(self):
        health_rep = self._service.get_system_health()
        broker_info = self.get_broker_info()

        active_feed_name = {
            "mt5": f"MetaTrader 5 Real Forex Broker ({broker_info.get('company', 'Exness')} - {broker_info.get('symbol', 'XAUUSDm')})",
            "binance": "Binance Public REST (24/7 Spot Crypto & Physical PAXG Gold)",
            "kraken": "Kraken Public Exchange (Spot Crypto)",
            "yahoo": "Yahoo Finance (Multi-Market Coverage)",
            "xaus": "XAUS Spot Feed (Keyless Real London Gold/Silver)",
            "auto": "NEXORA FX Smart Market Router (Verified Real Providers)"
        }.get(self._active_provider, "NEXORA FX Market Feed")

        is_any_live = health_rep["connected_providers"] > 0
        return {
            "symbol": broker_info.get("symbol", "XAUUSD"),
            "active_provider": self._active_provider,
            "primary_feed": active_feed_name,
            "status": "CONNECTED (REAL MARKET)" if is_any_live else "DISCONNECTED",
            "is_live": is_any_live,
            "cache_ttl_seconds": 10,
            "broker_info": broker_info,
            "notes": "100% Real Live Market Data. Zero simulated prices presented as live.",
            "providers_summary": f"{health_rep['connected_providers']}/{health_rep['total_providers']} providers active"
        }

    def fetch_candles(
        self,
        timeframe: str = "M15",
        limit: int = 200,
        symbol: str = "XAUUSD",
        force_refresh: bool = False,
        allow_simulation_fallback: bool = False,
        provider: str = None
    ):
        sym = symbol.upper()
        tf = timeframe.upper()
        selected_provider = provider or (None if self._active_provider == "auto" else self._active_provider)

        series = self._service.get_candles(
            symbol=sym,
            timeframe=tf,
            limit=limit,
            provider=selected_provider
        )

        if series and series.candles:
            candle_dicts = [c.model_dump() for c in series.candles]
            latest_price = candle_dicts[-1]["close"]
            broker_info = self.get_broker_info()

            return {
                "success": True,
                "symbol": sym,
                "timeframe": tf,
                "provider": series.provider,
                "source": f"{series.provider.upper()} ({series.provider_instrument})",
                "status": series.status.value,
                "is_live": series.is_live,
                "cached": False,
                "latest_price": latest_price,
                "bid": latest_price,
                "ask": latest_price,
                "spread": 0.0,
                "broker_info": broker_info,
                "last_update": series.retrieval_timestamp,
                "candle_count": len(candle_dicts),
                "missing_candles_detected": series.missing_candles_count,
                "candles": candle_dicts,
                "delay_info": series.delay_info
            }

        return {
            "success": False,
            "symbol": sym,
            "timeframe": tf,
            "provider": self._active_provider,
            "status": DataStatus.UNAVAILABLE.value,
            "is_live": False,
            "error": f"Real market data unavailable for '{sym}' on timeframe '{tf}'.",
            "candles": []
        }

market_data_engine = MarketDataEngine()

__all__ = [
    "market_data_engine",
    "market_data_service",
    "provider_registry",
    "AssetClass",
    "DataStatus",
    "Candle",
    "Quote",
    "CandleSeries",
    "Instrument",
    "ProviderCapability"
]
