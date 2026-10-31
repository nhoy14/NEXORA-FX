"""
NEXORA FX — Binance Public Spot Market Data Provider
High-frequency 24/7 crypto and physical gold spot feed.
No API key required for public ticker and kline endpoints.
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

logger = logging.getLogger("nexora.provider.binance")

class BinanceProvider(BaseMarketDataProvider):
    BASE_URL = "https://api.binance.com/api/v3"

    SYMBOL_MAP = {
        "BTCUSD": "BTCUSDT",
        "BTCUSDT": "BTCUSDT",
        "ETHUSD": "ETHUSDT",
        "ETHUSDT": "ETHUSDT",
        "SOLUSD": "SOLUSDT",
        "SOLUSDT": "SOLUSDT",
        "BNB": "BNBUSDT",
        "BNBUSD": "BNBUSDT",
        "BNBUSDT": "BNBUSDT",
        "XRP": "XRPUSDT",
        "XRPUSD": "XRPUSDT",
        "XRPUSDT": "XRPUSDT",
        "XAUUSD": "PAXGUSDT",  # Real Paxos Gold Spot 1:1 physical London gold backed
        "PAXGUSDT": "PAXGUSDT",
    }

    TF_MAP = {
        "M1": "1m",
        "M5": "5m",
        "M15": "15m",
        "M30": "30m",
        "H1": "1h",
        "H4": "4h",
        "D1": "1d",
        "W1": "1w",
        "MN1": "1M"
    }

    def __init__(self):
        super().__init__(provider_id="binance", name="Binance Public Market Data")
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": "NEXORA-FX/1.0"})

    def get_capabilities(self) -> ProviderCapability:
        return ProviderCapability(
            provider_id=self.provider_id,
            name=self.name,
            description="Official public Binance Spot REST API. Continuous 24/7 quotes and OHLC bars.",
            supported_asset_classes=[AssetClass.CRYPTO, AssetClass.METALS],
            supported_symbols=list(self.SYMBOL_MAP.keys()),
            supported_timeframes=list(self.TF_MAP.keys()),
            auth_required=False,
            quote_support=True,
            candle_support=True,
            historical_range="Up to 1000 bars per query across all standard intervals",
            known_delays="50-100ms REST latency",
            rate_limits="1200 weight / minute IP rate limit",
            is_verified=True,
            verification_notes="Keyless public endpoint verified active"
        )

    def check_health(self) -> Dict[str, Any]:
        try:
            r = self._session.get(f"{self.BASE_URL}/ping", timeout=4)
            return {
                "provider": self.provider_id,
                "status": "CONNECTED" if r.status_code == 200 else "DISCONNECTED",
                "is_live": (r.status_code == 200),
                "http_status": r.status_code,
                "endpoint": self.BASE_URL
            }
        except Exception as e:
            return {
                "provider": self.provider_id,
                "status": "DISCONNECTED",
                "is_live": False,
                "error": str(e)
            }

    def supports_symbol(self, symbol: str) -> bool:
        return symbol.upper() in self.SYMBOL_MAP or f"{symbol.upper()}USDT" in self.SYMBOL_MAP.values()

    def map_symbol(self, symbol: str) -> Optional[str]:
        s = symbol.upper()
        if s in self.SYMBOL_MAP:
            return self.SYMBOL_MAP[s]
        if s.endswith("USDT"):
            return s
        return f"{s}USDT"

    def get_quote(self, symbol: str) -> Optional[Quote]:
        bin_sym = self.map_symbol(symbol)
        if not bin_sym:
            return None

        try:
            # 24hr ticker for comprehensive change + bookTicker for precise bid/ask
            r_t = self._session.get(f"{self.BASE_URL}/ticker/24hr", params={"symbol": bin_sym}, timeout=5)
            r_b = self._session.get(f"{self.BASE_URL}/ticker/bookTicker", params={"symbol": bin_sym}, timeout=5)
            if r_t.status_code != 200 or r_b.status_code != 200:
                return None

            t_data = r_t.json()
            b_data = r_b.json()

            price = float(t_data["lastPrice"])
            bid = float(b_data["bidPrice"])
            ask = float(b_data["askPrice"])
            spread_val = round(ask - bid, 4) if ask >= bid else 0.0

            retrieval_utc = datetime.now(timezone.utc).isoformat()
            close_time_ms = int(t_data.get("closeTime", 0))
            source_utc = datetime.fromtimestamp(close_time_ms / 1000.0, timezone.utc).isoformat() if close_time_ms else retrieval_utc

            is_metal = "PAXG" in bin_sym
            asset_cls = AssetClass.METALS if is_metal else AssetClass.CRYPTO

            quote = Quote(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=bin_sym,
                asset_class=asset_cls,
                price=price,
                bid=bid,
                ask=ask,
                spread=spread_val,
                change_24h=float(t_data.get("priceChange", 0.0)),
                change_pct_24h=float(t_data.get("priceChangePercent", 0.0)),
                volume_24h=float(t_data.get("volume", 0.0)),
                source_timestamp=source_utc,
                retrieval_timestamp=retrieval_utc,
                status=DataStatus.LIVE,
                delay_seconds=0,
                currency="USDT",
                units="tokens" if not is_metal else "troy_oz",
                is_live=True
            )
            ok, _ = validate_quote(quote)
            return quote if ok else None
        except Exception as e:
            logger.warning(f"Binance get_quote error for {symbol}: {e}")
            return None

    def get_candles(self, symbol: str, timeframe: str = "H1", limit: int = 200) -> Optional[CandleSeries]:
        bin_sym = self.map_symbol(symbol)
        interval = self.TF_MAP.get(timeframe.upper())
        if not bin_sym or not interval:
            return None

        try:
            params = {
                "symbol": bin_sym,
                "interval": interval,
                "limit": min(max(limit, 50), 1000)
            }
            r = self._session.get(f"{self.BASE_URL}/klines", params=params, timeout=6)
            if r.status_code != 200:
                return None

            raw_bars = r.json()
            candles_raw = []
            for b in raw_bars:
                # b[0]=open_time_ms, b[1]=open, b[2]=high, b[3]=low, b[4]=close, b[5]=volume
                t_sec = int(b[0] / 1000)
                candles_raw.append({
                    "time": t_sec,
                    "open": float(b[1]),
                    "high": float(b[2]),
                    "low": float(b[3]),
                    "close": float(b[4]),
                    "volume": float(b[5]),
                    "iso_time": datetime.fromtimestamp(t_sec, timezone.utc).isoformat()
                })

            is_metal = "PAXG" in bin_sym
            asset_cls = AssetClass.METALS if is_metal else AssetClass.CRYPTO
            valid_candles, status, missing, _ = validate_candle_series(candles_raw, timeframe, asset_cls)
            if not valid_candles:
                return None

            now_utc = datetime.now(timezone.utc).isoformat()
            source_utc = valid_candles[-1].get("iso_time", now_utc)

            return CandleSeries(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=bin_sym,
                asset_class=asset_cls,
                timeframe=timeframe.upper(),
                candles=[Candle(**c) for c in valid_candles[-limit:]],
                status=status,
                source_timestamp=source_utc,
                retrieval_timestamp=now_utc,
                is_live=(status == DataStatus.LIVE),
                delay_info="None (Real-time 24/7 Binance REST)",
                missing_candles_count=missing
            )
        except Exception as e:
            logger.warning(f"Binance get_candles error for {symbol}: {e}")
            return None
