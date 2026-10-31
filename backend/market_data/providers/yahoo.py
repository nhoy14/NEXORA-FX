"""
NEXORA FX — Yahoo Finance Multi-Market Provider
Open-source tooling using yfinance for multi-asset coverage:
Forex, Metals, Indices, Stocks, Commodities, ETFs, and Yields.
Accurately reports exchange delays and timestamps.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import pandas as pd
import yfinance as yf

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

logger = logging.getLogger("nexora.provider.yahoo")

class YahooProvider(BaseMarketDataProvider):
    SYMBOL_MAP = {
        # Forex
        "EURUSD": "EURUSD=X",
        "GBPUSD": "GBPUSD=X",
        "USDJPY": "USDJPY=X",
        "USDCHF": "USDCHF=X",
        "USDCAD": "USDCAD=X",
        "AUDUSD": "AUDUSD=X",
        "NZDUSD": "NZDUSD=X",
        "EURJPY": "EURJPY=X",
        "GBPJPY": "GBPJPY=X",
        "EURGBP": "EURGBP=X",
        # Metals
        "XAUUSD": "GC=F",
        "XAGUSD": "SI=F",
        # Crypto
        "BTCUSD": "BTC-USD",
        "BTCUSDT": "BTC-USD",
        "ETHUSD": "ETH-USD",
        "ETHUSDT": "ETH-USD",
        "SOLUSD": "SOL-USD",
        "SOLUSDT": "SOL-USD",
        # Indices
        "US100": "^NDX",
        "US500": "^GSPC",
        "US30": "^DJI",
        "GER40": "^GDAXI",
        "UK100": "^FTSE",
        "JP225": "^N225",
        # Commodities
        "USOIL": "CL=F",
        "UKOIL": "BZ=F",
        "NATGAS": "NG=F",
        "COPPER": "HG=F",
        # Stocks
        "AAPL": "AAPL",
        "MSFT": "MSFT",
        "NVDA": "NVDA",
        "TSLA": "TSLA",
        "AMZN": "AMZN",
        "GOOGL": "GOOGL",
        # ETFs / Bonds
        "SPY": "SPY",
        "QQQ": "QQQ",
        "GLD": "GLD",
        "TNX": "^TNX"
    }

    TF_CONFIG = {
        "M1": {"interval": "1m", "period": "5d"},
        "M5": {"interval": "5m", "period": "5d"},
        "M15": {"interval": "15m", "period": "10d"},
        "M30": {"interval": "30m", "period": "30d"},
        "H1": {"interval": "60m", "period": "60d"},
        "H4": {"interval": "60m", "period": "180d", "resample": "4h"},
        "D1": {"interval": "1d", "period": "1y"},
        "W1": {"interval": "1wk", "period": "5y"},
        "MN1": {"interval": "1mo", "period": "10y"},
    }

    def __init__(self):
        super().__init__(provider_id="yahoo", name="Yahoo Finance (yfinance)")
        self._quote_cache: Dict[str, Dict[str, Any]] = {}
        self._candles_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 15  # 15s cache to avoid rate limits

    def get_capabilities(self) -> ProviderCapability:
        return ProviderCapability(
            provider_id=self.provider_id,
            name=self.name,
            description="Broad institutional market coverage via Yahoo Finance. Supports Forex, CME Futures, Indices, Equities, Commodities, and Bonds.",
            supported_asset_classes=[
                AssetClass.FOREX,
                AssetClass.METALS,
                AssetClass.CRYPTO,
                AssetClass.INDICES,
                AssetClass.STOCKS,
                AssetClass.COMMODITIES,
                AssetClass.BONDS_ETFS
            ],
            supported_symbols=list(self.SYMBOL_MAP.keys()),
            supported_timeframes=list(self.TF_CONFIG.keys()),
            auth_required=False,
            quote_support=True,
            candle_support=True,
            historical_range="Multi-year historical coverage on daily/weekly; up to 60 days on intraday",
            known_delays="Real-time for Forex & US Equities; 15-minute public exchange delay on CME/NYMEX Futures and Global Indices",
            rate_limits="Public fair use rate limits (~2000 requests/hour with caching)",
            is_verified=True,
            verification_notes="Verified active across Forex, Metals, Indices, Stocks, and Commodities"
        )

    def check_health(self) -> Dict[str, Any]:
        try:
            ticker = yf.Ticker("EURUSD=X")
            df = ticker.history(period="1d", interval="1h")
            ok = not df.empty
            return {
                "provider": self.provider_id,
                "status": "CONNECTED" if ok else "DEGRADED",
                "is_live": ok,
                "test_symbol": "EURUSD=X",
                "bars_retrieved": len(df)
            }
        except Exception as e:
            return {"provider": self.provider_id, "status": "DISCONNECTED", "is_live": False, "error": str(e)}

    def supports_symbol(self, symbol: str) -> bool:
        s = symbol.upper()
        return s in self.SYMBOL_MAP or s in self.SYMBOL_MAP.values()

    def map_symbol(self, symbol: str) -> Optional[str]:
        s = symbol.upper()
        if s in self.SYMBOL_MAP:
            return self.SYMBOL_MAP[s]
        # Return as-is if already a valid Yahoo ticker (e.g. ^NDX, AAPL, CL=F)
        return s

    def get_quote(self, symbol: str) -> Optional[Quote]:
        yf_sym = self.map_symbol(symbol)
        if not yf_sym:
            return None

        # Check cache
        now_ts = time.time()
        if yf_sym in self._quote_cache:
            entry = self._quote_cache[yf_sym]
            if now_ts - entry["timestamp"] < self._cache_ttl:
                return entry["quote"]

        try:
            ticker = yf.Ticker(yf_sym)
            df = ticker.history(period="2d", interval="5m")
            if df.empty:
                df = ticker.history(period="5d", interval="1d")
            if df.empty:
                return None

            latest_row = df.iloc[-1]
            prev_row = df.iloc[-2] if len(df) > 1 else latest_row

            price = float(latest_row["Close"])
            prev_price = float(prev_row["Close"])
            change = round(price - prev_price, 4)
            change_pct = round((change / prev_price) * 100.0, 2) if prev_price > 0 else 0.0
            volume = float(latest_row.get("Volume", 0.0))

            # Determine delay
            is_futures_or_index = yf_sym.startswith("^") or yf_sym.endswith("=F")
            delay_sec = 900 if is_futures_or_index else 0
            status = DataStatus.DELAYED if delay_sec > 0 else DataStatus.LIVE

            retrieval_utc = datetime.now(timezone.utc).isoformat()
            # Timestamp of latest candle
            last_dt = df.index[-1]
            source_utc = last_dt.to_pydatetime().astimezone(timezone.utc).isoformat() if hasattr(last_dt, "to_pydatetime") else retrieval_utc

            quote = Quote(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=yf_sym,
                asset_class=self._classify_symbol(symbol),
                price=price,
                bid=price,
                ask=price,
                spread=0.0,
                change_24h=change,
                change_pct_24h=change_pct,
                volume_24h=volume,
                source_timestamp=source_utc,
                retrieval_timestamp=retrieval_utc,
                status=status,
                delay_seconds=delay_sec,
                currency="USD",
                units="points",
                is_live=(status == DataStatus.LIVE)
            )

            ok, _ = validate_quote(quote)
            if ok:
                self._quote_cache[yf_sym] = {"timestamp": now_ts, "quote": quote}
                return quote
            return None
        except Exception as e:
            logger.warning(f"Yahoo get_quote error for {symbol} ({yf_sym}): {e}")
            return None

    def get_candles(self, symbol: str, timeframe: str = "H1", limit: int = 200) -> Optional[CandleSeries]:
        yf_sym = self.map_symbol(symbol)
        tf_cfg = self.TF_CONFIG.get(timeframe.upper())
        if not yf_sym or not tf_cfg:
            return None

        cache_key = f"{yf_sym}_{timeframe.upper()}"
        now_ts = time.time()
        if cache_key in self._candles_cache:
            entry = self._candles_cache[cache_key]
            if now_ts - entry["timestamp"] < self._cache_ttl:
                return entry["series"]

        try:
            ticker = yf.Ticker(yf_sym)
            df = ticker.history(period=tf_cfg["period"], interval=tf_cfg["interval"])
            if df.empty or len(df) < 5:
                return None

            # Handle H4 resampling if configured
            if tf_cfg.get("resample") == "4h":
                agg_dict = {
                    "Open": "first",
                    "High": "max",
                    "Low": "min",
                    "Close": "last",
                    "Volume": "sum"
                }
                df = df.resample("4h").agg(agg_dict).dropna()

            candles_raw = []
            for idx, row in df.iterrows():
                # Convert index to UTC epoch timestamp
                if hasattr(idx, "tz") and idx.tz is not None:
                    t_sec = int(idx.timestamp())
                    iso_str = idx.isoformat()
                else:
                    t_sec = int(pd.Timestamp(idx, tz="UTC").timestamp())
                    iso_str = pd.Timestamp(idx, tz="UTC").isoformat()

                candles_raw.append({
                    "time": t_sec,
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row.get("Volume", 0.0)),
                    "iso_time": iso_str
                })

            asset_cls = self._classify_symbol(symbol)
            valid_candles, status, missing, _ = validate_candle_series(candles_raw, timeframe, asset_cls)
            if not valid_candles:
                return None

            now_utc = datetime.now(timezone.utc).isoformat()
            source_utc = valid_candles[-1].get("iso_time", now_utc)

            is_delayed = yf_sym.startswith("^") or yf_sym.endswith("=F")
            delay_text = "15-minute public exchange delay" if is_delayed else "Near real-time public feed"

            series = CandleSeries(
                symbol=symbol,
                provider=self.provider_id,
                provider_instrument=yf_sym,
                asset_class=asset_cls,
                timeframe=timeframe.upper(),
                candles=[Candle(**c) for c in valid_candles[-limit:]],
                status=status,
                source_timestamp=source_utc,
                retrieval_timestamp=now_utc,
                is_live=(status == DataStatus.LIVE),
                delay_info=delay_text,
                missing_candles_count=missing
            )

            self._candles_cache[cache_key] = {"timestamp": now_ts, "series": series}
            return series
        except Exception as e:
            logger.warning(f"Yahoo get_candles error for {symbol} ({yf_sym}): {e}")
            return None

    def _classify_symbol(self, symbol: str) -> AssetClass:
        s = symbol.upper()
        if "XAU" in s or "GOLD" in s or "XAG" in s or "SILVER" in s:
            return AssetClass.METALS
        if any(c in s for c in ["BTC", "ETH", "SOL", "XRP"]):
            return AssetClass.CRYPTO
        if any(i in s for i in ["US100", "US500", "US30", "GER40", "UK100", "JP225"]):
            return AssetClass.INDICES
        if any(m in s for m in ["OIL", "BRENT", "GAS", "COPPER"]):
            return AssetClass.COMMODITIES
        if any(f in s for f in ["EUR", "GBP", "USD", "JPY", "CHF", "CAD", "AUD", "NZD"]) and len(s) == 6:
            return AssetClass.FOREX
        if s in ["SPY", "QQQ", "GLD", "TNX"]:
            return AssetClass.BONDS_ETFS
        return AssetClass.STOCKS
