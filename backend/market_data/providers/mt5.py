"""
NEXORA FX — MetaTrader 5 (MT5) Real Forex Broker Provider
Direct IPC bridge to running MetaTrader 5 terminal.
Streams actual broker ticks, bid/ask spreads, and tick-accurate OHLC candles.
Zero external latency (< 1ms).
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import pandas as pd

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

logger = logging.getLogger("nexora.provider.mt5")

class MT5Provider(BaseMarketDataProvider):
    def __init__(self):
        super().__init__(provider_id="mt5", name="MetaTrader 5 Real Broker")
        self._initialized = False
        self._broker_info: Dict[str, Any] = {}
        self._symbol_cache: Dict[str, str] = {}
        self._all_broker_symbols: List[str] = []
        self._probe()

    def _probe(self):
        """Probes local MT5 terminal and loads broker symbols."""
        try:
            import MetaTrader5 as mt5
            if not mt5.initialize():
                logger.info("MT5 terminal not running or not initialized.")
                self._initialized = False
                return

            t_info = mt5.terminal_info()
            a_info = mt5.account_info()
            if t_info and t_info.connected:
                self._initialized = True
                self._broker_info = {
                    "connected": True,
                    "company": a_info.company if a_info else t_info.company,
                    "server": a_info.server if a_info else "",
                    "login": a_info.login if a_info else 0,
                    "currency": a_info.currency if a_info else "USD",
                    "leverage": a_info.leverage if a_info else 0,
                    "balance": a_info.balance if a_info else 0.0,
                    "equity": a_info.equity if a_info else 0.0,
                    "terminal_path": t_info.path,
                    "build": t_info.build,
                    "ping": t_info.ping_last
                }
                symbols = mt5.symbols_get()
                if symbols:
                    self._all_broker_symbols = [s.name for s in symbols]
                    logger.info(f"MT5 connected to {self._broker_info['company']} with {len(self._all_broker_symbols)} symbols.")
        except Exception as ex:
            logger.debug(f"MT5 probe exception: {ex}")
            self._initialized = False

    def _ensure_init(self) -> bool:
        if self._initialized:
            return True
        try:
            import MetaTrader5 as mt5
            if mt5.initialize():
                self._probe()
                return self._initialized
        except Exception:
            pass
        return False

    def get_capabilities(self) -> ProviderCapability:
        return ProviderCapability(
            provider_id=self.provider_id,
            name=self.name,
            description="Direct desktop bridge to MetaTrader 5 terminal with real broker ticks and candles.",
            supported_asset_classes=[
                AssetClass.FOREX,
                AssetClass.METALS,
                AssetClass.CRYPTO,
                AssetClass.INDICES,
                AssetClass.COMMODITIES,
                AssetClass.STOCKS
            ],
            supported_symbols=self._all_broker_symbols[:100] if self._all_broker_symbols else ["XAUUSDm", "EURUSDm", "GBPUSDm", "BTCUSDm"],
            supported_timeframes=["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"],
            auth_required=False,
            quote_support=True,
            candle_support=True,
            historical_range="Up to 100,000 bars direct from broker history cache",
            known_delays="0ms (Local IPC to broker terminal)",
            rate_limits="Unlimited local IPC",
            is_verified=self._initialized,
            verification_notes=f"Active broker: {self._broker_info.get('company', 'Unknown')}, Server: {self._broker_info.get('server', 'N/A')}"
        )

    def check_health(self) -> Dict[str, Any]:
        ready = self._ensure_init()
        return {
            "provider": self.provider_id,
            "status": "CONNECTED" if ready else "DISCONNECTED",
            "is_live": ready,
            "broker": self._broker_info.get("company", "N/A"),
            "server": self._broker_info.get("server", "N/A"),
            "login": self._broker_info.get("login", 0),
            "ping_ms": self._broker_info.get("ping", 0) / 1000.0,
            "total_symbols": len(self._all_broker_symbols)
        }

    def map_symbol(self, symbol: str) -> Optional[str]:
        """Maps unified symbol (e.g. EURUSD, XAUUSD) to broker-specific symbol (e.g. EURUSDm, XAUUSDm)."""
        clean = symbol.upper().replace("-", "").replace("=X", "").replace("=F", "")
        if clean in self._symbol_cache:
            return self._symbol_cache[clean]

        if not self._all_broker_symbols:
            self._probe()

        # Check exact match
        if clean in self._all_broker_symbols:
            self._symbol_cache[clean] = clean
            return clean

        # Check broker suffix variations: 'm', '.pro', '.raw', '.a', '247m'
        candidates = [f"{clean}m", f"{clean}.a", f"{clean}.pro", f"{clean}.raw", f"{clean}247m"]
        if clean == "XAUUSD":
            candidates.extend(["GOLD", "GOLDm", "XAUUSDm", "XAUUSD247m"])
        elif clean == "XAGUSD":
            candidates.extend(["SILVER", "SILVERm", "XAGUSDm"])
        elif clean == "US100":
            candidates.extend(["USTECm", "NAS100m", "US100m", "USTEC", "NAS100"])
        elif clean == "US500":
            candidates.extend(["US500m", "SPX500m", "US500"])
        elif clean == "US30":
            candidates.extend(["US30m", "DJ30m", "US30"])
        elif clean == "USOIL":
            candidates.extend(["USOILm", "WTIm", "USOIL"])
        elif clean == "UKOIL":
            candidates.extend(["UKOILm", "BRENTm", "UKOIL"])

        for c in candidates:
            if c in self._all_broker_symbols:
                self._symbol_cache[clean] = c
                return c

        # Broad search
        for s in self._all_broker_symbols:
            if clean in s:
                self._symbol_cache[clean] = s
                return s

        return None

    def supports_symbol(self, symbol: str) -> bool:
        return self.map_symbol(symbol) is not None

    def get_quote(self, symbol: str) -> Optional[Quote]:
        if not self._ensure_init():
            return None
        import MetaTrader5 as mt5

        broker_sym = self.map_symbol(symbol)
        if not broker_sym:
            return None

        mt5.symbol_select(broker_sym, True)
        tick = mt5.symbol_info_tick(broker_sym)
        sym_info = mt5.symbol_info(broker_sym)
        if not tick or not sym_info:
            return None

        price = float(tick.last) if tick.last > 0 else float(tick.bid)
        bid = float(tick.bid) if tick.bid > 0 else price
        ask = float(tick.ask) if tick.ask > 0 else price
        spread_val = round(ask - bid, sym_info.digits) if ask >= bid else 0.0

        retrieval_utc = datetime.now(timezone.utc).isoformat()
        source_utc = datetime.fromtimestamp(tick.time, timezone.utc).isoformat() if tick.time else retrieval_utc

        quote = Quote(
            symbol=symbol,
            provider=self.provider_id,
            provider_instrument=broker_sym,
            asset_class=self._classify_symbol(symbol),
            price=price,
            bid=bid,
            ask=ask,
            spread=spread_val,
            source_timestamp=source_utc,
            retrieval_timestamp=retrieval_utc,
            status=DataStatus.LIVE,
            delay_seconds=0,
            currency="USD",
            is_live=True
        )
        ok, _ = validate_quote(quote)
        return quote if ok else None

    def get_candles(self, symbol: str, timeframe: str = "H1", limit: int = 200) -> Optional[CandleSeries]:
        if not self._ensure_init():
            return None
        import MetaTrader5 as mt5

        broker_sym = self.map_symbol(symbol)
        if not broker_sym:
            return None

        mt5.symbol_select(broker_sym, True)

        tf_map = {
            "M1": mt5.TIMEFRAME_M1,
            "M5": mt5.TIMEFRAME_M5,
            "M15": mt5.TIMEFRAME_M15,
            "M30": mt5.TIMEFRAME_M30,
            "H1": mt5.TIMEFRAME_H1,
            "H4": mt5.TIMEFRAME_H4,
            "D1": mt5.TIMEFRAME_D1,
            "W1": mt5.TIMEFRAME_W1,
            "MN1": mt5.TIMEFRAME_MN1,
        }
        mt5_tf = tf_map.get(timeframe.upper())
        if mt5_tf is None:
            return None

        rates = mt5.copy_rates_from_pos(broker_sym, mt5_tf, 0, max(limit, 50))
        if rates is None or len(rates) == 0:
            return None

        candles_raw = []
        for r in rates:
            t = int(r["time"])
            candles_raw.append({
                "time": t,
                "open": round(float(r["open"]), 5),
                "high": round(float(r["high"]), 5),
                "low": round(float(r["low"]), 5),
                "close": round(float(r["close"]), 5),
                "volume": float(r["tick_volume"]),
                "iso_time": datetime.fromtimestamp(t, timezone.utc).isoformat()
            })

        asset_class = self._classify_symbol(symbol)
        valid_candles, status, missing, _ = validate_candle_series(candles_raw, timeframe, asset_class)

        if not valid_candles:
            return None

        now_utc = datetime.now(timezone.utc).isoformat()
        source_utc = valid_candles[-1].get("iso_time", now_utc)

        return CandleSeries(
            symbol=symbol,
            provider=self.provider_id,
            provider_instrument=broker_sym,
            asset_class=asset_class,
            timeframe=timeframe.upper(),
            candles=[Candle(**c) for c in valid_candles[-limit:]],
            status=status,
            source_timestamp=source_utc,
            retrieval_timestamp=now_utc,
            is_live=(status == DataStatus.LIVE),
            delay_info="0ms Direct MT5 IPC",
            missing_candles_count=missing
        )

    def _classify_symbol(self, symbol: str) -> AssetClass:
        s = symbol.upper()
        if "XAU" in s or "GOLD" in s or "XAG" in s or "SILVER" in s:
            return AssetClass.METALS
        if any(c in s for c in ["BTC", "ETH", "SOL", "XRP", "BNB"]):
            return AssetClass.CRYPTO
        if any(i in s for i in ["US100", "US500", "US30", "GER40", "UK100", "JP225", "TEC"]):
            return AssetClass.INDICES
        if any(m in s for m in ["OIL", "BRENT", "GAS", "COPPER"]):
            return AssetClass.COMMODITIES
        if any(f in s for f in ["EUR", "GBP", "USD", "JPY", "CHF", "CAD", "AUD", "NZD"]):
            return AssetClass.FOREX
        return AssetClass.STOCKS
