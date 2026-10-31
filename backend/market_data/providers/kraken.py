"""
NEXORA FX — Kraken Public Market Data Provider
Real spot crypto exchange market feed.
No API key required for public Ticker and OHLC endpoints.
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

logger = logging.getLogger("nexora.provider.kraken")

class KrakenProvider(BaseMarketDataProvider):
    BASE_URL = "https://api.kraken.com/0/public"

    SYMBOL_MAP = {
        "BTCUSD": "XBTUSD",
        "BTCUSDT": "XBTUSDT",
        "ETHUSD": "ETHUSD",
        "ETHUSDT": "ETHUSDT",
        "SOLUSD": "SOLUSD",
        "SOLUSDT": "SOLUSDT",
        "XRPUSD": "XRPUSD",
        "XRPUSDT": "XRPUSDT"
    }

    TF_MAP = {
        "M1": 1,
        "M5": 5,
        "M15": 15,
        "M30": 30,
        "H1": 60,
        "H4": 240,
        "D1": 1440,
        "W1": 10080
    }

    def __init__(self):
        super().__init__(provider_id="kraken", name="Kraken Public Exchange Feed")
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": "NEXORA-FX/1.0"})

    def get_capabilities(self) -> ProviderCapability:
        return ProviderCapability(
            provider_id=self.provider_id,
            name=self.name,
            description="Official Kraken Spot Public REST API. Regulated US/EU crypto exchange.",
            supported_asset_classes=[AssetClass.CRYPTO],
            supported_symbols=list(self.SYMBOL_MAP.keys()),
            supported_timeframes=list(self.TF_MAP.keys()),
            auth_required=False,
            quote_support=True,
            candle_support=True,
            historical_range="Up to 720 bars per query",
            known_delays="50-150ms REST latency",
            rate_limits="Tiered public rate limits (approx 15 calls / 30 sec)",
            is_verified=True,
            verification_notes="Verified active via public REST endpoints"
        )

    def check_health(self) -> Dict[str, Any]:
        try:
            r = self._session.get(f"{self.BASE_URL}/SystemStatus", timeout=4)
            if r.status_code == 200:
                data = r.json()
                status_str = data.get("result", {}).get("status", "unknown")
                return {
                    "provider": self.provider_id,
                    "status": "CONNECTED" if status_str == "online" else "DEGRADED",
                    "is_live": (status_str == "online"),
                    "system_status": status_str
                }
            return {"provider": self.provider_id, "status": "DISCONNECTED", "is_live": False}
        except Exception as e:
            return {"provider": self.provider_id, "status": "DISCONNECTED", "is_live": False, "error": str(e)}

    def supports_symbol(self, symbol: str) -> bool:
        return symbol.upper() in self.SYMBOL_MAP

    def map_symbol(self, symbol: str) -> Optional[str]:
        return self.SYMBOL_MAP.get(symbol.upper())

    def get_quote(self, symbol: str) -> Optional[Quote]:
        kraken_pair = self.map_symbol(symbol)
        if not kraken_pair:
            return None

        try:
            r = self._session.get(f"{self.BASE_URL}/Ticker", params={"pair": kraken_pair}, timeout=5)
            if r.status_code != 200:
                return None

            data = r.json()
            if data.get("error"):
                logger.warning(f"Kraken error for {kraken_pair}: {data['error']}")
                return None

            result = data.get("result", {})
            if not result:
                return None

            # Kraken returns pair under canonical or alt name (e.g. XXBTZUSD)
            pair_key = list(result.keys())[0]
            ticker_info = result[pair_key]

            # c[0]: last trade price, a[0]: ask price, b[0]: bid price, v[1]: 24h volume
            price = float(ticker_info["c"][0])
            ask = float(ticker_info["a"][0])
            bid = float(ticker_info["b"][0])
            spread_val = round(ask - bid, 2) if ask >= bid else 0.0
            volume_24h = float(ticker_info["v"][1])

            retrieval_utc = datetime.now(timezone.utc).isoformat()

            quote = Quote(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=pair_key,
                asset_class=AssetClass.CRYPTO,
                price=price,
                bid=bid,
                ask=ask,
                spread=spread_val,
                volume_24h=volume_24h,
                source_timestamp=retrieval_utc,
                retrieval_timestamp=retrieval_utc,
                status=DataStatus.LIVE,
                delay_seconds=0,
                currency="USD",
                units="coins",
                is_live=True
            )
            ok, _ = validate_quote(quote)
            return quote if ok else None
        except Exception as e:
            logger.warning(f"Kraken get_quote error for {symbol}: {e}")
            return None

    def get_candles(self, symbol: str, timeframe: str = "H1", limit: int = 200) -> Optional[CandleSeries]:
        kraken_pair = self.map_symbol(symbol)
        interval_min = self.TF_MAP.get(timeframe.upper())
        if not kraken_pair or not interval_min:
            return None

        try:
            r = self._session.get(f"{self.BASE_URL}/OHLC", params={"pair": kraken_pair, "interval": interval_min}, timeout=6)
            if r.status_code != 200:
                return None

            data = r.json()
            if data.get("error"):
                return None

            result = data.get("result", {})
            pair_keys = [k for k in result.keys() if k != "last"]
            if not pair_keys:
                return None

            pair_key = pair_keys[0]
            raw_bars = result[pair_key]

            candles_raw = []
            for b in raw_bars:
                # b[0]=time_sec, b[1]=open, b[2]=high, b[3]=low, b[4]=close, b[5]=vwap, b[6]=volume
                t_sec = int(b[0])
                candles_raw.append({
                    "time": t_sec,
                    "open": float(b[1]),
                    "high": float(b[2]),
                    "low": float(b[3]),
                    "close": float(b[4]),
                    "volume": float(b[6]),
                    "iso_time": datetime.fromtimestamp(t_sec, timezone.utc).isoformat()
                })

            valid_candles, status, missing, _ = validate_candle_series(candles_raw, timeframe, AssetClass.CRYPTO)
            if not valid_candles:
                return None

            now_utc = datetime.now(timezone.utc).isoformat()
            source_utc = valid_candles[-1].get("iso_time", now_utc)

            return CandleSeries(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=pair_key,
                asset_class=AssetClass.CRYPTO,
                timeframe=timeframe.upper(),
                candles=[Candle(**c) for c in valid_candles[-limit:]],
                status=status,
                source_timestamp=source_utc,
                retrieval_timestamp=now_utc,
                is_live=(status == DataStatus.LIVE),
                delay_info="None (Real-time Kraken REST)",
                missing_candles_count=missing
            )
        except Exception as e:
            logger.warning(f"Kraken get_candles error for {symbol}: {e}")
            return None
