"""
NEXORA FX — Configuration & Environment Settings
Handles application settings, provider credentials, default symbols, and asset specs.
"""

import os
from typing import Dict, Any

# Server Network Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Cache & Polling
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "10"))

# Provider API Keys
TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY", "")
ALPHAVANTAGE_API_KEY = os.getenv("ALPHAVANTAGE_API_KEY", "")

# Default Strategy Parameters
DEFAULT_TIMEFRAME = os.getenv("DEFAULT_TIMEFRAME", "M15")
DEFAULT_MIN_SCORE = int(os.getenv("DEFAULT_MIN_SCORE", "70"))
EMA_FAST = int(os.getenv("EMA_FAST", "9"))
EMA_MEDIUM = int(os.getenv("EMA_MEDIUM", "21"))
EMA_SLOW = int(os.getenv("EMA_SLOW", "50"))
EMA_BASELINE = int(os.getenv("EMA_BASELINE", "200"))
EMA_200_FILTER = os.getenv("EMA_200_FILTER", "True").lower() in ("true", "1", "yes")

# Default Contract Specifications by Asset Class
CONTRACT_SPECS: Dict[str, Dict[str, Any]] = {
    "FOREX": {
        "contract_size": 100000.0,  # 100k units per standard lot
        "tick_size": 0.0001,
        "tick_value": 10.0,
        "pip_multiplier": 10000.0,
        "default_spread": 0.00015,
        "default_slippage": 0.00005,
    },
    "FOREX_JPY": {
        "contract_size": 100000.0,
        "tick_size": 0.01,
        "tick_value": 6.5,  # Approx USD per JPY pip
        "pip_multiplier": 100.0,
        "default_spread": 0.015,
        "default_slippage": 0.005,
    },
    "METALS_GOLD": {
        "contract_size": 100.0,     # 100 troy oz per lot
        "tick_size": 0.01,
        "tick_value": 1.0,          # $1.00 per $0.01 per lot
        "pip_multiplier": 10.0,     # 1 pip = $0.10
        "default_spread": 0.25,
        "default_slippage": 0.10,
    },
    "METALS_SILVER": {
        "contract_size": 5000.0,    # 5,000 troy oz per lot
        "tick_size": 0.005,
        "tick_value": 25.0,
        "pip_multiplier": 100.0,
        "default_spread": 0.03,
        "default_slippage": 0.01,
    },
    "CRYPTO": {
        "contract_size": 1.0,       # 1 coin
        "tick_size": 0.01,
        "tick_value": 0.01,
        "pip_multiplier": 1.0,
        "default_spread": 2.0,
        "default_slippage": 1.0,
    },
    "INDICES": {
        "contract_size": 1.0,       # 1 index point = $1 (or broker CFDs)
        "tick_size": 0.1,
        "tick_value": 0.1,
        "pip_multiplier": 1.0,
        "default_spread": 1.0,
        "default_slippage": 0.5,
    },
    "STOCKS": {
        "contract_size": 1.0,       # 1 share
        "tick_size": 0.01,
        "tick_value": 0.01,
        "pip_multiplier": 100.0,
        "default_spread": 0.05,
        "default_slippage": 0.02,
    },
    "COMMODITIES": {
        "contract_size": 1000.0,    # 1,000 barrels of crude oil
        "tick_size": 0.01,
        "tick_value": 10.0,
        "pip_multiplier": 100.0,
        "default_spread": 0.04,
        "default_slippage": 0.02,
    }
}
