"""
NEXORA FX — Twelve Data Provider Adapter
Optional commercial/free-tier financial data API.
Requires TWELVEDATA_API_KEY environment variable.
Reports honestly if API key is not configured.
"""

import logging
import os
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from backend.market_data.base import (
    BaseMarketDataProvider,
    ProviderCapability,
    AssetClass,
    DataStatus,
    Quote,
    Candle,
    CandleSeries
)
from backend.market_data.validation import validate_candle_series, validate_quote
from backend.config import TWELVEDATA_API_KEY

logger = logging.getLogger("nexora.provider.twelvedata")

class TwelveDataProvider(BaseMarketDataProvider):
    BASE_URL = "https://api.twelvedata.com"

    SYMBOL_MAP = {
        "EURUSD": "EUR/USD",
        "GBPUSD": "GBP/USD",
        "USDJPY": "USD/JPY",
        "XAUUSD": "XAU/USD",
        "BTCUSD": "BTC/USD",
        "US100": "QQQ",
        "AAPL": "AAPL"
    }

    TF_MAP = {
        "M1": "1min",
        "M5": "5min",
        "M15": "15min",
        "M30": "30min",
        "H1": "1h",
        "H4": "4h",
        "D1": "1day",
        "W1": "1week",
        "MN1": "1month"
    }

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(provider_id="twelve_data", name="Twelve Data")
        self.api_key = api_key or TWELVEDATA_API_KEY or os.getenv("TWELVEDATA_API_KEY", "")
        self._session = requests.Session()

    def get_capabilities(self) -> ProviderCapability:
        has_key = bool(self.api_key)
        return ProviderCapability(
            provider_id=self.provider_id,
            name=self.name,
            description="Multi-asset financial API for Forex, Stocks, Indices, and Crypto. Free tier available with registration.",
            supported_asset_classes=[AssetClass.FOREX, AssetClass.METALS, AssetClass.CRYPTO, AssetClass.STOCKS],
            supported_symbols=list(self.SYMBOL_MAP.keys()),
            supported_timeframes=list(self.TF_MAP.keys()),
            auth_required=True,
            api_key_configured=has_key,
            quote_support=True,
            candle_support=True,
            historical_range="Up to 5000 credits on free tier (8 credits/minute)",
            known_delays="Real-time for forex/crypto; 15-minute exchange delay on equities unless upgraded",
            rate_limits="8 API requests per minute / 800 per day on free tier",
            is_verified=has_key,
            verification_notes="API key configured and active" if has_key else "NOT VERIFIED: Requires TWELVEDATA_API_KEY in .env"
        )

    def check_health(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "provider": self.provider_id,
                "status": "NOT VERIFIED (API KEY REQUIRED)",
                "is_live": False,
                "notes": "Provide TWELVEDATA_API_KEY in environment or .env file"
            }

        try:
            r = self._session.get(f"{self.BASE_URL}/api_usage", params={"apikey": self.api_key}, timeout=5)
            if r.status_code == 200:
                data = r.json()
                return {
                    "provider": self.provider_id,
                    "status": "CONNECTED",
                    "is_live": True,
                    "credits_used": data.get("current_usage"),
                    "plan": data.get("plan")
                }
            return {
                "provider": self.provider_id,
                "status": "AUTH_FAILED",
                "is_live": False,
                "http_code": r.status_code,
                "error": r.text
            }
        except Exception as e:
            return {"provider": self.provider_id, "status": "DISCONNECTED", "is_live": False, "error": str(e)}

    def supports_symbol(self, symbol: str) -> bool:
        return symbol.upper() in self.SYMBOL_MAP

    def map_symbol(self, symbol: str) -> Optional[str]:
        return self.SYMBOL_MAP.get(symbol.upper(), symbol)

    def get_quote(self, symbol: str) -> Optional[Quote]:
        if not self.api_key:
            return None
        mapped = self.map_symbol(symbol)
        try:
            r = self._session.get(f"{self.BASE_URL}/quote", params={"symbol": mapped, "apikey": self.api_key}, timeout=5)
            if r.status_code != 200:
                return None
            data = r.json()
            if data.get("status") == "error":
                return None

            price = float(data.get("close", data.get("price", 0.0)))
            retrieval_utc = datetime.now(timezone.utc).isoformat()

            quote = Quote(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=mapped,
                asset_class=AssetClass.FOREX,
                price=price,
                bid=float(data.get("bid", price)) if data.get("bid") else price,
                ask=float(data.get("ask", price)) if data.get("ask") else price,
                spread=0.0,
                change_24h=float(data.get("change", 0.0)),
                change_pct_24h=float(data.get("percent_change", 0.0)),
                source_timestamp=data.get("datetime") or retrieval_utc,
                retrieval_timestamp=retrieval_utc,
                status=DataStatus.LIVE,
                delay_seconds=0,
                currency="USD",
                units="points",
                is_live=True
            )
            ok, _ = validate_quote(quote)
            return quote if ok else None
        except Exception as e:
            logger.warning(f"Twelve Data get_quote error for {symbol}: {e}")
            return None

    def get_candles(self, symbol: str, timeframe: str = "H1", limit: int = 200) -> Optional[CandleSeries]:
        if not self.api_key:
            return None
        mapped = self.map_symbol(symbol)
        interval = self.TF_MAP.get(timeframe.upper())
        if not interval:
            return None

        try:
            params = {
                "symbol": mapped,
                "interval": interval,
                "outputsize": min(limit, 500),
                "apikey": self.api_key
            }
            r = self._session.get(f"{self.BASE_URL}/time_series", params=params, timeout=6)
            if r.status_code != 200:
                return None
            data = r.json()
            values = data.get("values", [])
            if not values:
                return None

            candles_raw = []
            for v in reversed(values):  # Twelve Data returns newest first
                # Parse datetime string
                dt = datetime.fromisoformat(v["datetime"].replace("Z", "+00:00"))
                t_sec = int(dt.timestamp())
                candles_raw.append({
                    "time": t_sec,
                    "open": float(v["open"]),
                    "high": float(v["high"]),
                    "low": float(v["low"]),
                    "close": float(v["close"]),
                    "volume": float(v.get("volume", 0.0)),
                    "iso_time": dt.isoformat()
                })

            valid_candles, status, missing, _ = validate_candle_series(candles_raw, timeframe, AssetClass.FOREX)
            if not valid_candles:
                return None

            now_utc = datetime.now(timezone.utc).isoformat()
            source_utc = valid_candles[-1].get("iso_time", now_utc)

            return CandleSeries(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=mapped,
                asset_class=AssetClass.FOREX,
                timeframe=timeframe.upper(),
                candles=[Candle(**c) for c in valid_candles[-limit:]],
                status=status,
                source_timestamp=source_utc,
                retrieval_timestamp=now_utc,
                is_live=(status == DataStatus.LIVE),
                delay_info="Twelve Data REST Feed",
                missing_candles_count=missing
            )
        except Exception as e:
            logger.warning(f"Twelve Data get_candles error for {symbol}: {e}")
            return None
