"""
NEXORA FX — Market Data Base Interfaces and Models
Defines core enums, typed models, and abstract provider classes.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class AssetClass(str, Enum):
    FOREX = "FOREX"
    METALS = "METALS"
    CRYPTO = "CRYPTO"
    INDICES = "INDICES"
    STOCKS = "STOCKS"
    COMMODITIES = "COMMODITIES"
    BONDS_ETFS = "BONDS_ETFS"

class DataStatus(str, Enum):
    LIVE = "LIVE"
    DELAYED = "DELAYED"
    STALE = "STALE"
    CLOSED = "CLOSED"
    DISCONNECTED = "DISCONNECTED"
    INVALID = "INVALID"
    UNAVAILABLE = "UNAVAILABLE"

class Candle(BaseModel):
    time: int = Field(..., description="UNIX epoch timestamp in seconds")
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    iso_time: Optional[str] = None

class Quote(BaseModel):
    symbol: str
    provider: str
    provider_instrument: str
    asset_class: AssetClass
    price: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    spread: Optional[float] = None
    change_24h: Optional[float] = None
    change_pct_24h: Optional[float] = None
    volume_24h: Optional[float] = None
    source_timestamp: str
    retrieval_timestamp: str
    status: DataStatus
    delay_seconds: int = 0
    currency: str = "USD"
    units: str = "points"
    is_live: bool = True

class CandleSeries(BaseModel):
    symbol: str
    provider: str
    provider_instrument: str
    asset_class: AssetClass
    timeframe: str
    candles: List[Candle]
    status: DataStatus
    source_timestamp: str
    retrieval_timestamp: str
    is_live: bool
    delay_info: str = "None (Real-time)"
    missing_candles_count: int = 0

class ProviderCapability(BaseModel):
    provider_id: str
    name: str
    description: str
    supported_asset_classes: List[AssetClass]
    supported_symbols: List[str]
    supported_timeframes: List[str]
    auth_required: bool
    api_key_configured: bool = True
    quote_support: bool = True
    candle_support: bool = True
    historical_range: str
    known_delays: str
    rate_limits: str
    is_verified: bool = False
    verification_notes: str = ""

class Instrument(BaseModel):
    symbol: str
    name: str
    asset_class: AssetClass
    base_currency: str
    quote_currency: str
    contract_size: float
    tick_size: float
    tick_value: float
    pip_multiplier: float
    default_spread: float
    provider_mappings: Dict[str, str] = Field(default_factory=dict)
    trading_hours: str = "24/5"

class BaseMarketDataProvider(ABC):
    """Abstract Base Class for all NEXORA FX market data providers."""

    def __init__(self, provider_id: str, name: str):
        self.provider_id = provider_id
        self.name = name

    @abstractmethod
    def get_capabilities(self) -> ProviderCapability:
        """Returns provider specifications, supported assets, and limitations."""
        pass

    @abstractmethod
    def check_health(self) -> Dict[str, Any]:
        """Performs real connectivity verification check against provider endpoints."""
        pass

    @abstractmethod
    def supports_symbol(self, symbol: str) -> bool:
        """Checks if unified symbol is supported by this provider."""
        pass

    @abstractmethod
    def map_symbol(self, symbol: str) -> Optional[str]:
        """Translates unified symbol (e.g. XAUUSD) to provider specific ticker (e.g. GC=F or PAXGUSDT)."""
        pass

    @abstractmethod
    def get_quote(self, symbol: str) -> Optional[Quote]:
        """Fetches latest real quote from source. Returns None if unsupported or failed."""
        pass

    @abstractmethod
    def get_candles(self, symbol: str, timeframe: str = "H1", limit: int = 200) -> Optional[CandleSeries]:
        """Fetches historical OHLC candles from source. Never fabricates prices."""
        pass
