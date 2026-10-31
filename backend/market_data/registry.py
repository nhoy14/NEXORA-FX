"""
NEXORA FX — Provider Registry and Instrument Catalogue
Registers all verified market data providers and maintains cross-market symbol mappings.
Distinguishes supported vs unavailable symbols honestly.
"""

import logging
from typing import Dict, Any, List, Optional
from backend.market_data.base import (
    BaseMarketDataProvider,
    Instrument,
    AssetClass,
    ProviderCapability
)
from backend.market_data.providers.mt5 import MT5Provider
from backend.market_data.providers.binance import BinanceProvider
from backend.market_data.providers.kraken import KrakenProvider
from backend.market_data.providers.yahoo import YahooProvider
from backend.market_data.providers.xaus import XAUSProvider
from backend.market_data.providers.twelve_data import TwelveDataProvider

logger = logging.getLogger("nexora.registry")

class ProviderRegistry:
    def __init__(self):
        self._providers: Dict[str, BaseMarketDataProvider] = {}
        self._instruments: Dict[str, Instrument] = {}
        self._register_default_providers()
        self._seed_instrument_catalogue()

    def _register_default_providers(self):
        """Initializes and registers all candidate provider adapters."""
        try:
            self.register_provider(MT5Provider())
        except Exception as e:
            logger.warning(f"Could not load MT5Provider: {e}")

        try:
            self.register_provider(BinanceProvider())
        except Exception as e:
            logger.warning(f"Could not load BinanceProvider: {e}")

        try:
            self.register_provider(KrakenProvider())
        except Exception as e:
            logger.warning(f"Could not load KrakenProvider: {e}")

        try:
            self.register_provider(YahooProvider())
        except Exception as e:
            logger.warning(f"Could not load YahooProvider: {e}")

        try:
            self.register_provider(XAUSProvider())
        except Exception as e:
            logger.warning(f"Could not load XAUSProvider: {e}")

        try:
            self.register_provider(TwelveDataProvider())
        except Exception as e:
            logger.warning(f"Could not load TwelveDataProvider: {e}")

    def register_provider(self, provider: BaseMarketDataProvider):
        self._providers[provider.provider_id] = provider
        logger.info(f"Registered market data provider: {provider.name} ({provider.provider_id})")

    def get_provider(self, provider_id: str) -> Optional[BaseMarketDataProvider]:
        return self._providers.get(provider_id.lower())

    def list_providers(self) -> List[ProviderCapability]:
        return [p.get_capabilities() for p in self._providers.values()]

    def get_provider_statuses(self) -> List[Dict[str, Any]]:
        statuses = []
        for pid, p in self._providers.items():
            health = p.check_health()
            caps = p.get_capabilities()
            statuses.append({
                "provider_id": pid,
                "name": p.name,
                "is_live": health.get("is_live", False),
                "status": health.get("status", "UNKNOWN"),
                "auth_required": caps.auth_required,
                "api_key_configured": caps.api_key_configured,
                "is_verified": caps.is_verified,
                "known_delays": caps.known_delays,
                "rate_limits": caps.rate_limits,
                "supported_asset_classes": [a.value for a in caps.supported_asset_classes],
                "details": health
            })
        return statuses

    def _seed_instrument_catalogue(self):
        """Builds master catalogue across Forex, Metals, Crypto, Indices, Stocks, Commodities, ETFs."""
        instruments = [
            # A. FOREX
            Instrument(
                symbol="EURUSD", name="Euro / US Dollar", asset_class=AssetClass.FOREX,
                base_currency="EUR", quote_currency="USD", contract_size=100000.0,
                tick_size=0.00001, tick_value=1.0, pip_multiplier=10000.0, default_spread=0.00015,
                provider_mappings={"mt5": "EURUSDm", "yahoo": "EURUSD=X", "twelve_data": "EUR/USD"}
            ),
            Instrument(
                symbol="GBPUSD", name="British Pound / US Dollar", asset_class=AssetClass.FOREX,
                base_currency="GBP", quote_currency="USD", contract_size=100000.0,
                tick_size=0.00001, tick_value=1.0, pip_multiplier=10000.0, default_spread=0.00020,
                provider_mappings={"mt5": "GBPUSDm", "yahoo": "GBPUSD=X", "twelve_data": "GBP/USD"}
            ),
            Instrument(
                symbol="USDJPY", name="US Dollar / Japanese Yen", asset_class=AssetClass.FOREX,
                base_currency="USD", quote_currency="JPY", contract_size=100000.0,
                tick_size=0.001, tick_value=0.65, pip_multiplier=100.0, default_spread=0.015,
                provider_mappings={"mt5": "USDJPYm", "yahoo": "USDJPY=X", "twelve_data": "USD/JPY"}
            ),
            Instrument(
                symbol="USDCHF", name="US Dollar / Swiss Franc", asset_class=AssetClass.FOREX,
                base_currency="USD", quote_currency="CHF", contract_size=100000.0,
                tick_size=0.00001, tick_value=1.1, pip_multiplier=10000.0, default_spread=0.00018,
                provider_mappings={"mt5": "USDCHFm", "yahoo": "USDCHF=X"}
            ),
            Instrument(
                symbol="USDCAD", name="US Dollar / Canadian Dollar", asset_class=AssetClass.FOREX,
                base_currency="USD", quote_currency="CAD", contract_size=100000.0,
                tick_size=0.00001, tick_value=0.75, pip_multiplier=10000.0, default_spread=0.00018,
                provider_mappings={"mt5": "USDCADm", "yahoo": "USDCAD=X"}
            ),
            Instrument(
                symbol="AUDUSD", name="Australian Dollar / US Dollar", asset_class=AssetClass.FOREX,
                base_currency="AUD", quote_currency="USD", contract_size=100000.0,
                tick_size=0.00001, tick_value=1.0, pip_multiplier=10000.0, default_spread=0.00018,
                provider_mappings={"mt5": "AUDUSDm", "yahoo": "AUDUSD=X"}
            ),
            Instrument(
                symbol="NZDUSD", name="New Zealand Dollar / US Dollar", asset_class=AssetClass.FOREX,
                base_currency="NZD", quote_currency="USD", contract_size=100000.0,
                tick_size=0.00001, tick_value=1.0, pip_multiplier=10000.0, default_spread=0.00020,
                provider_mappings={"mt5": "NZDUSDm", "yahoo": "NZDUSD=X"}
            ),
            Instrument(
                symbol="EURJPY", name="Euro / Japanese Yen", asset_class=AssetClass.FOREX,
                base_currency="EUR", quote_currency="JPY", contract_size=100000.0,
                tick_size=0.001, tick_value=0.65, pip_multiplier=100.0, default_spread=0.018,
                provider_mappings={"mt5": "EURJPYm", "yahoo": "EURJPY=X"}
            ),
            Instrument(
                symbol="GBPJPY", name="British Pound / Japanese Yen", asset_class=AssetClass.FOREX,
                base_currency="GBP", quote_currency="JPY", contract_size=100000.0,
                tick_size=0.001, tick_value=0.65, pip_multiplier=100.0, default_spread=0.025,
                provider_mappings={"mt5": "GBPJPYm", "yahoo": "GBPJPY=X"}
            ),
            Instrument(
                symbol="EURGBP", name="Euro / British Pound", asset_class=AssetClass.FOREX,
                base_currency="EUR", quote_currency="GBP", contract_size=100000.0,
                tick_size=0.00001, tick_value=1.3, pip_multiplier=10000.0, default_spread=0.00020,
                provider_mappings={"mt5": "EURGBPm", "yahoo": "EURGBP=X"}
            ),

            # B. PRECIOUS METALS
            Instrument(
                symbol="XAUUSD", name="Gold Spot / US Dollar", asset_class=AssetClass.METALS,
                base_currency="XAU", quote_currency="USD", contract_size=100.0,
                tick_size=0.01, tick_value=1.0, pip_multiplier=10.0, default_spread=0.25,
                provider_mappings={"mt5": "XAUUSDm", "binance": "PAXGUSDT", "xaus": "XAU", "yahoo": "GC=F", "twelve_data": "XAU/USD"}
            ),
            Instrument(
                symbol="XAGUSD", name="Silver Spot / US Dollar", asset_class=AssetClass.METALS,
                base_currency="XAG", quote_currency="USD", contract_size=5000.0,
                tick_size=0.005, tick_value=25.0, pip_multiplier=100.0, default_spread=0.03,
                provider_mappings={"mt5": "XAGUSDm", "xaus": "XAG", "yahoo": "SI=F"}
            ),

            # C. CRYPTOCURRENCY
            Instrument(
                symbol="BTCUSD", name="Bitcoin / US Dollar", asset_class=AssetClass.CRYPTO,
                base_currency="BTC", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=1.0, default_spread=2.0,
                provider_mappings={"mt5": "BTCUSDm", "binance": "BTCUSDT", "kraken": "XBTUSD", "yahoo": "BTC-USD"}
            ),
            Instrument(
                symbol="ETHUSD", name="Ethereum / US Dollar", asset_class=AssetClass.CRYPTO,
                base_currency="ETH", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=1.0, default_spread=0.5,
                provider_mappings={"mt5": "ETHUSDm", "binance": "ETHUSDT", "kraken": "ETHUSD", "yahoo": "ETH-USD"}
            ),
            Instrument(
                symbol="SOLUSD", name="Solana / US Dollar", asset_class=AssetClass.CRYPTO,
                base_currency="SOL", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=1.0, default_spread=0.1,
                provider_mappings={"mt5": "SOLUSDm", "binance": "SOLUSDT", "kraken": "SOLUSD", "yahoo": "SOL-USD"}
            ),
            Instrument(
                symbol="BNB", name="Binance Coin", asset_class=AssetClass.CRYPTO,
                base_currency="BNB", quote_currency="USDT", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=1.0, default_spread=0.2,
                provider_mappings={"binance": "BNBUSDT"}
            ),
            Instrument(
                symbol="XRP", name="Ripple XRP", asset_class=AssetClass.CRYPTO,
                base_currency="XRP", quote_currency="USD", contract_size=1.0,
                tick_size=0.0001, tick_value=0.0001, pip_multiplier=100.0, default_spread=0.002,
                provider_mappings={"mt5": "XRPUSDm", "binance": "XRPUSDT", "kraken": "XRPUSD"}
            ),

            # D. INDICES
            Instrument(
                symbol="US100", name="Nasdaq 100 Index", asset_class=AssetClass.INDICES,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.1, tick_value=0.1, pip_multiplier=1.0, default_spread=1.2,
                provider_mappings={"mt5": "USTECm", "yahoo": "^NDX"}
            ),
            Instrument(
                symbol="US500", name="S&P 500 Index", asset_class=AssetClass.INDICES,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.1, tick_value=0.1, pip_multiplier=1.0, default_spread=0.5,
                provider_mappings={"mt5": "US500m", "yahoo": "^GSPC"}
            ),
            Instrument(
                symbol="US30", name="Dow Jones 30 Index", asset_class=AssetClass.INDICES,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=1.0, tick_value=1.0, pip_multiplier=1.0, default_spread=2.0,
                provider_mappings={"mt5": "US30m", "yahoo": "^DJI"}
            ),
            Instrument(
                symbol="GER40", name="DAX 40 Index (Germany)", asset_class=AssetClass.INDICES,
                base_currency="EUR", quote_currency="EUR", contract_size=1.0,
                tick_size=0.5, tick_value=0.5, pip_multiplier=1.0, default_spread=1.5,
                provider_mappings={"yahoo": "^GDAXI"}
            ),
            Instrument(
                symbol="UK100", name="FTSE 100 Index (UK)", asset_class=AssetClass.INDICES,
                base_currency="GBP", quote_currency="GBP", contract_size=1.0,
                tick_size=0.5, tick_value=0.5, pip_multiplier=1.0, default_spread=1.5,
                provider_mappings={"yahoo": "^FTSE"}
            ),
            Instrument(
                symbol="JP225", name="Nikkei 225 Index (Japan)", asset_class=AssetClass.INDICES,
                base_currency="JPY", quote_currency="JPY", contract_size=1.0,
                tick_size=5.0, tick_value=5.0, pip_multiplier=1.0, default_spread=8.0,
                provider_mappings={"yahoo": "^N225"}
            ),

            # E. STOCKS
            Instrument(
                symbol="AAPL", name="Apple Inc.", asset_class=AssetClass.STOCKS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.05,
                provider_mappings={"yahoo": "AAPL", "twelve_data": "AAPL"}
            ),
            Instrument(
                symbol="MSFT", name="Microsoft Corporation", asset_class=AssetClass.STOCKS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.06,
                provider_mappings={"yahoo": "MSFT"}
            ),
            Instrument(
                symbol="NVDA", name="NVIDIA Corporation", asset_class=AssetClass.STOCKS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.08,
                provider_mappings={"yahoo": "NVDA"}
            ),
            Instrument(
                symbol="TSLA", name="Tesla Inc.", asset_class=AssetClass.STOCKS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.08,
                provider_mappings={"yahoo": "TSLA"}
            ),
            Instrument(
                symbol="AMZN", name="Amazon.com Inc.", asset_class=AssetClass.STOCKS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.05,
                provider_mappings={"yahoo": "AMZN"}
            ),

            # F. COMMODITIES
            Instrument(
                symbol="USOIL", name="Crude Oil (WTI)", asset_class=AssetClass.COMMODITIES,
                base_currency="USD", quote_currency="USD", contract_size=1000.0,
                tick_size=0.01, tick_value=10.0, pip_multiplier=100.0, default_spread=0.04,
                provider_mappings={"mt5": "USOILm", "yahoo": "CL=F"}
            ),
            Instrument(
                symbol="UKOIL", name="Brent Crude Oil", asset_class=AssetClass.COMMODITIES,
                base_currency="USD", quote_currency="USD", contract_size=1000.0,
                tick_size=0.01, tick_value=10.0, pip_multiplier=100.0, default_spread=0.04,
                provider_mappings={"mt5": "UKOILm", "yahoo": "BZ=F"}
            ),
            Instrument(
                symbol="NATGAS", name="Natural Gas (Henry Hub)", asset_class=AssetClass.COMMODITIES,
                base_currency="USD", quote_currency="USD", contract_size=10000.0,
                tick_size=0.001, tick_value=10.0, pip_multiplier=1000.0, default_spread=0.005,
                provider_mappings={"yahoo": "NG=F"}
            ),
            Instrument(
                symbol="COPPER", name="Copper Futures", asset_class=AssetClass.COMMODITIES,
                base_currency="USD", quote_currency="USD", contract_size=25000.0,
                tick_size=0.0005, tick_value=12.5, pip_multiplier=1000.0, default_spread=0.001,
                provider_mappings={"yahoo": "HG=F"}
            ),

            # G. OTHER ASSETS (ETFs & Bonds)
            Instrument(
                symbol="SPY", name="SPDR S&P 500 ETF Trust", asset_class=AssetClass.BONDS_ETFS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.02,
                provider_mappings={"yahoo": "SPY"}
            ),
            Instrument(
                symbol="QQQ", name="Invesco QQQ Trust (Nasdaq ETF)", asset_class=AssetClass.BONDS_ETFS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.02,
                provider_mappings={"yahoo": "QQQ"}
            ),
            Instrument(
                symbol="GLD", name="SPDR Gold Shares ETF", asset_class=AssetClass.BONDS_ETFS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.03,
                provider_mappings={"yahoo": "GLD"}
            ),
            Instrument(
                symbol="TNX", name="CBOE 10-Year Treasury Yield Index", asset_class=AssetClass.BONDS_ETFS,
                base_currency="USD", quote_currency="USD", contract_size=1.0,
                tick_size=0.01, tick_value=0.01, pip_multiplier=100.0, default_spread=0.02,
                provider_mappings={"yahoo": "^TNX"}
            )
        ]

        for inst in instruments:
            self._instruments[inst.symbol] = inst

    def get_instrument(self, symbol: str) -> Optional[Instrument]:
        return self._instruments.get(symbol.upper())

    def list_instruments(self, asset_class: Optional[AssetClass] = None) -> List[Instrument]:
        if asset_class:
            return [i for i in self._instruments.values() if i.asset_class == asset_class]
        return list(self._instruments.values())

    def list_markets(self) -> Dict[str, List[Dict[str, Any]]]:
        """Returns catalogue grouped by asset class with provider availability."""
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for inst in self._instruments.values():
            cls_name = inst.asset_class.value
            if cls_name not in grouped:
                grouped[cls_name] = []

            # Check which providers support this instrument
            supported_provs = []
            for pid, prov in self._providers.items():
                if pid in inst.provider_mappings or prov.supports_symbol(inst.symbol):
                    supported_provs.append(pid)

            grouped[cls_name].append({
                "symbol": inst.symbol,
                "name": inst.name,
                "asset_class": inst.asset_class.value,
                "contract_size": inst.contract_size,
                "tick_size": inst.tick_size,
                "tick_value": inst.tick_value,
                "default_spread": inst.default_spread,
                "supported_providers": supported_provs,
                "mappings": inst.provider_mappings
            })
        return grouped

provider_registry = ProviderRegistry()
