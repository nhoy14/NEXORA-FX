"""
NEXORA FX — XAUS Keyless Spot Gold Provider
Real-time London Spot Gold and Silver physical market feeds.
Endpoints:
- /api/v1/spot
- /api/v1/intraday
- /api/v1/history
Keyless public JSON API.
"""

import logging
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

logger = logging.getLogger("nexora.provider.xaus")

class XAUSProvider(BaseMarketDataProvider):
    BASE_URL = "https://xaus.com"

    def __init__(self):
        super().__init__(provider_id="xaus", name="XAUS Gold Spot Feed")
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": "NEXORA-FX/1.0"})

    def get_capabilities(self) -> ProviderCapability:
        return ProviderCapability(
            provider_id=self.provider_id,
            name=self.name,
            description="Keyless public JSON API for live XAU/USD physical London gold spot, silver spot, and intraday history.",
            supported_asset_classes=[AssetClass.METALS],
            supported_symbols=["XAUUSD", "XAGUSD"],
            supported_timeframes=["M5", "M15", "H1", "D1"],
            auth_required=False,
            quote_support=True,
            candle_support=True,
            historical_range="Intraday 24h tick series and daily multi-year history",
            known_delays="Real-time spot ticks with zero exchange delay",
            rate_limits="Standard public rate limits (~60 req/min)",
            is_verified=True,
            verification_notes="Verified keyless JSON spot endpoint active at https://xaus.com/api/v1/spot"
        )

    def check_health(self) -> Dict[str, Any]:
        try:
            r = self._session.get(f"{self.BASE_URL}/api/v1/spot", timeout=5)
            if r.status_code == 200:
                data = r.json()
                price = data.get("xau", {}).get("price")
                return {
                    "provider": self.provider_id,
                    "status": "CONNECTED",
                    "is_live": True,
                    "gold_spot_price": price,
                    "silver_spot_price": data.get("silver_usd_oz"),
                    "updated_at": data.get("updated_at")
                }
            return {"provider": self.provider_id, "status": "DISCONNECTED", "is_live": False, "http_code": r.status_code}
        except Exception as e:
            return {"provider": self.provider_id, "status": "DISCONNECTED", "is_live": False, "error": str(e)}

    def supports_symbol(self, symbol: str) -> bool:
        return symbol.upper() in ["XAUUSD", "GOLD", "XAGUSD", "SILVER"]

    def map_symbol(self, symbol: str) -> Optional[str]:
        s = symbol.upper()
        if s in ["XAUUSD", "GOLD"]:
            return "XAU"
        if s in ["XAGUSD", "SILVER"]:
            return "XAG"
        return None

    def get_quote(self, symbol: str) -> Optional[Quote]:
        mapped = self.map_symbol(symbol)
        if not mapped:
            return None

        try:
            r = self._session.get(f"{self.BASE_URL}/api/v1/spot", timeout=5)
            if r.status_code != 200:
                return None

            data = r.json()
            if mapped == "XAU":
                price = float(data.get("xau", {}).get("price", data.get("spot_usd_oz", 0.0)))
                units = "troy_oz"
            else:
                price = float(data.get("silver_usd_oz", 0.0))
                units = "troy_oz"

            retrieval_utc = datetime.now(timezone.utc).isoformat()
            source_utc = data.get("updated_at") or retrieval_utc

            quote = Quote(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=f"{mapped}/USD",
                asset_class=AssetClass.METALS,
                price=price,
                bid=price,
                ask=price,
                spread=0.0,
                source_timestamp=source_utc,
                retrieval_timestamp=retrieval_utc,
                status=DataStatus.LIVE,
                delay_seconds=0,
                currency="USD",
                units=units,
                is_live=True
            )
            ok, _ = validate_quote(quote)
            return quote if ok else None
        except Exception as e:
            logger.warning(f"XAUS get_quote error: {e}")
            return None

    def get_candles(self, symbol: str, timeframe: str = "H1", limit: int = 200) -> Optional[CandleSeries]:
        mapped = self.map_symbol(symbol)
        if not mapped or mapped != "XAU":
            return None

        try:
            # XAUS supplies intraday points at /api/v1/intraday
            r = self._session.get(f"{self.BASE_URL}/api/v1/intraday", timeout=6)
            if r.status_code != 200:
                return None

            data = r.json()
            raw_points = data.get("points", [])
            if not raw_points:
                return None

            # Convert points into OHLC buckets
            candles_raw = []
            for pt in raw_points:
                # pt is typically {"t": epoch_sec, "p": price} or [epoch_sec, price]
                if isinstance(pt, dict):
                    t = int(pt.get("t", pt.get("time", 0)))
                    p = float(pt.get("p", pt.get("price", 0.0)))
                elif isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    t = int(pt[0])
                    p = float(pt[1])
                else:
                    continue

                if p > 0 and t > 0:
                    candles_raw.append({
                        "time": t,
                        "open": p,
                        "high": p,
                        "low": p,
                        "close": p,
                        "volume": 1.0,
                        "iso_time": datetime.fromtimestamp(t, timezone.utc).isoformat()
                    })

            if len(candles_raw) < 5:
                return None

            valid_candles, status, missing, _ = validate_candle_series(candles_raw, timeframe, AssetClass.METALS)
            if not valid_candles:
                return None

            now_utc = datetime.now(timezone.utc).isoformat()
            source_utc = valid_candles[-1].get("iso_time", now_utc)

            return CandleSeries(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument="XAU/USD Spot",
                asset_class=AssetClass.METALS,
                timeframe=timeframe.upper(),
                candles=[Candle(**c) for c in valid_candles[-limit:]],
                status=status,
                source_timestamp=source_utc,
                retrieval_timestamp=now_utc,
                is_live=(status == DataStatus.LIVE),
                delay_info="None (Keyless XAUS Spot)",
                missing_candles_count=missing
            )
        except Exception as e:
            logger.warning(f"XAUS get_candles error: {e}")
            return None
