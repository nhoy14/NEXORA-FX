# NEXORA FX — All Markets Institutional Trading Terminal
**Real Market Data • EMA • MSNR • Smart Money Concepts (SMC) • Multi-Market Scanner • Walk-Forward Backtester**

---

## 1. Executive Summary & Architecture

**NEXORA FX** is a full-stack multi-market quantitative analysis, algorithmic scanning, and backtesting trading terminal. It supports multiple financial asset classes using **verified real market data**, strictly preventing simulated prices from ever being presented as live market feeds.

### Supported Financial Markets
1. **Forex (Currencies)**: EURUSD, GBPUSD, USDJPY, USDCHF, USDCAD, AUDUSD, NZDUSD, EURJPY, GBPJPY, EURGBP.
2. **Precious Metals**: XAUUSD (Gold Spot), XAGUSD (Silver Spot).
3. **Cryptocurrency (24/7)**: BTCUSD / BTCUSDT, ETHUSD / ETHUSDT, SOLUSD / SOLUSDT, BNB, XRP.
4. **Indices**: US100 (Nasdaq 100), US500 (S&P 500), US30 (Dow Jones 30), GER40 (DAX), UK100 (FTSE 100), JP225 (Nikkei 225).
5. **Stocks & Equities**: AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL.
6. **Commodities & Energy**: USOIL (WTI Crude Oil), UKOIL (Brent Crude Oil), NATGAS (Natural Gas), COPPER.
7. **ETFs & Yields**: SPY, QQQ, GLD, TNX (10-Year US Treasury Yield).

### System Architecture
```
nexora-fx/
├── backend/
│   ├── main.py                  # FastAPI REST Server & Static Asset Dispatcher
│   ├── config.py                # Environment configurations & contract specs
│   ├── database.py              # SQLite storage (Journal, Backtest, Watchlist, Settings)
│   ├── indicators.py            # EMA 9/21/50/200, SMA 20/50/200, RSI 14, MACD, ATR 14, Bollinger, VWAP
│   ├── msnr_smc.py              # Zero look-ahead SMC (BOS, CHoCH, OB, FVG, Sweeps, 50% Equilibrium)
│   ├── signal_engine.py         # Multi-market 0-100 score engine (BUY / SELL / WAIT)
│   ├── risk_manager.py          # Multi-asset position & lot sizer with circuit breakers
│   ├── backtester.py            # Chronological walk-forward simulator with collision handling
│   ├── scanner.py               # Concurrent multi-market screener with ThreadPoolExecutor
│   ├── market_data/             # Modular provider architecture
│   │   ├── __init__.py          # Unified market data engine facade
│   │   ├── base.py              # Abstract interfaces, enums, and typed models
│   │   ├── validation.py        # Strict OHLC validation, timestamp sorting & freshness
│   │   ├── registry.py          # Instrument catalogue & symbol cross-mapping
│   │   ├── service.py           # Intelligent router, fallback chain & TTL cache
│   │   └── providers/
│   │       ├── mt5.py           # Official MetaTrader 5 Broker Bridge (< 1ms IPC)
│   │       ├── binance.py       # Binance Public 24/7 Spot REST API (Keyless)
│   │       ├── kraken.py        # Kraken Public Crypto REST API (Keyless)
│   │       ├── yahoo.py         # Yahoo Finance via yfinance (Multi-Market Keyless)
│   │       ├── xaus.py          # XAUS Keyless London Spot Gold & Silver API
│   │       └── twelve_data.py   # Twelve Data API adapter (Auth required)
│   ├── tests/
│   │   ├── test_all.py          # Core engine unit tests
│   │   ├── test_api_server.py   # FastAPI endpoint tests
│   │   └── test_multi_market.py # Multi-market integration & provider tests
│   └── requirements.txt         # Production dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx            # Left Navigation with institutional badges
│   │   │   ├── TopHeader.jsx          # Live Quote, Symbol Switcher, Timeframe, System Status
│   │   │   ├── CraziiCanvasChart.jsx  # 100% custom HTML5 Canvas CRAZII Pro Terminal
│   │   │   ├── EquityCurveCanvas.jsx  # Backtester equity curve rendering engine
│   │   │   └── Toast.jsx              # System alerts & trade feedback toasts
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx      # Ticker tape, Hero setup card, mini-chart, sessions
│   │   │   ├── CraziiChartPage.jsx    # Full tactical CRAZII chart terminal with 1-click execution
│   │   │   ├── MarketScannerPage.jsx  # Multi-market technical screener table & filters
│   │   │   ├── AllMarketsPage.jsx     # Luxury grid across all asset classes
│   │   │   ├── CategoryMarketPage.jsx # Specialized Forex, Metals, Crypto, Indices, Stocks, Commodities
│   │   │   ├── EmaAnalysisPage.jsx    # EMA 9, 21, 50, 200 alignment, ribbon & crossover
│   │   │   ├── MsnrSmcPage.jsx        # Classic A/V, OC Levels, SBR/RBS flips, BSL/SSL, OB, FVG
│   │   │   ├── MultiTimeframePage.jsx # 6-timeframe matrix confluence & verdict
│   │   │   ├── TradingSignalsPage.jsx # Institutional signal cards with Entry/SL/TP
│   │   │   ├── BacktestingPage.jsx    # Walk-forward simulator with equity curve & trade log
│   │   │   ├── JournalPage.jsx        # SQLite-persisted trade journal & audit log
│   │   │   ├── RiskCalculatorPage.jsx # Exact contract-size lot calculator
│   │   │   ├── ScreenshotAnalysisPage.jsx # Heuristic AI chart image computer vision
│   │   │   ├── DataSourcesPage.jsx    # Live latency & provider health telemetry
│   │   │   └── SettingsPage.jsx       # Platform configuration deck
│   │   ├── services/
│   │   │   └── api.js                 # Centralized typed HTTP API service layer
│   │   ├── index.css                  # Preserved Dark Navy & Luxury Gold design system
│   │   ├── App.jsx                    # Root application component & routing
│   │   └── main.jsx                   # React 18 entry point
│   ├── package.json                   # React 18, Vite, Lucide-React
│   └── vite.config.js                 # Vite production build to dist/ with /api proxy
├── .env.example                 # Environment configuration template
└── README.md                    # System documentation
```

---

## 2. Verified Data Providers Status & Disclosures

| Provider | Status | Asset Classes | Auth Requirement | Latency / Delay | Verification Details |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **MetaTrader 5 (MT5)** | **VERIFIED & CONNECTED** | Forex, Metals, Crypto, Indices, Commodities, Stocks | Local IPC to Broker Terminal | **< 1ms** | Connected to Exness (`Exness-MT5Trial6`, 355 symbols) |
| **Binance Public API** | **VERIFIED & CONNECTED** | Crypto (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`), Spot Gold (`PAXGUSDT`) | Keyless Public REST | **50ms** | 24/7 Continuous live klines & bookTicker |
| **Kraken Public API** | **VERIFIED & CONNECTED** | Crypto (`XBTUSD`, `ETHUSD`, `SOLUSD`, `XRPUSD`) | Keyless Public REST | **80ms** | Regulated US/EU exchange public ticker & OHLC |
| **Yahoo Finance** | **VERIFIED & CONNECTED** | Global Multi-Asset (Forex, CME Futures, Indices, Stocks, Commodities) | Keyless Public Tooling | **0ms (FX/Equities)** / **15m (CME Futures/Indices)** | Real-time FX & US equities; CME 15-min delay clearly disclosed |
| **XAUS Spot Feed** | **VERIFIED & CONNECTED** | Physical Gold (`XAUUSD`), Silver (`XAGUSD`) | Keyless Public JSON | **< 200ms** | Verified live at `https://xaus.com/api/v1/spot` |
| **Twelve Data** | **AUTH REQUIRED** | Forex, Stocks, Indices, Crypto | Requires `TWELVEDATA_API_KEY` | Real-time | Adapter implemented; honestly reports `AUTH REQUIRED` if key is absent |

> [!IMPORTANT]
> **No Fake Data Policy**: NEXORA FX never presents simulated or randomized numbers as live prices. If a market feed is unreachable or the market is closed over the weekend, the platform honestly flags the status as `CLOSED`, `DELAYED`, or `UNAVAILABLE`, and disables live trade signals for capital preservation.

---

## 3. Quantitative Analysis & Algorithms

### 3.1 Technical Indicators
- **Exponential Moving Averages**: EMA 9, 21, 50, 200 with fan alignment and ribbon compression detection.
- **Simple Moving Averages**: SMA 20, 50, 200.
- **RSI (14)**: Wilder's Smoothed Relative Strength Index with overbought ($\ge 65$) and oversold ($\le 35$) momentum zones.
- **MACD (12, 26, 9)**: MACD line, Signal line, and Histogram momentum divergences.
- **ATR (14)**: Wilder's Average True Range for dynamic volatility stop-loss calculation.
- **Bollinger Bands (20, 2.0)**: Upper, Middle, Lower bands with Bandwidth and %B volatility tracking.
- **VWAP**: Cumulative Volume-Weighted Average Price (calculated where provider volume $> 0$).
- **Support & Resistance**: Dynamic horizontal clustering with touch-count strength weighting.

### 3.2 Smart Money Concepts (SMC) & MSNR Detection
- **Swing Highs & Lows**: Fractals identified with 3 left bars and 2 right confirmation bars (strictly avoiding look-ahead bias).
- **Break of Structure (BOS)**: Closed candle expansion in the direction of the active structural trend.
- **Change of Character (CHoCH)**: Structural trend reversal signaled by candle body close beyond counter-swing.
- **Order Blocks (OB)**: Institutional supply/demand zones before structural breaks, with real-time mitigation tracking.
- **Fair Value Gaps (FVG)**: 3-bar liquidity imbalance tracking ($Low_3 > High_1$ for Bullish, $High_3 < Low_1$ for Bearish).
- **Liquidity Sweeps**: Wick manipulation piercing swing levels followed by immediate body close rejection.
- **50% Equilibrium**: Quantifies the dealing range between swing high and low to enforce **Discount Zone** BUYs and **Premium Zone** SELLs.

### 3.3 Strategy Scoring (0 to 100) & Signal Engine
Signals are evaluated on a 0-100 confluence scale:
- EMA alignment: up to **25 pts**
- Market Structure (BOS / CHoCH): up to **25 pts**
- SMC Confluence (Order Block touch, FVG fill, Liquidity sweep): up to **35 pts**
- Equilibrium (Discount / Premium zone): up to **15 pts**

A **BUY** or **SELL** setup requires a score $\ge 70$. If confirmation is absent, conditions conflict, or data is stale, the engine returns **WAIT**.

---

## 4. Multi-Asset Risk Management & Sizing Formula

NEXORA FX enforces institutional position sizing tailored to each asset class:

$$\text{Risk Capital (\$)} = \text{Account Balance} \times \frac{\text{Risk \%}}{100}$$

$$\text{Total Drag (pts)} = |\text{Entry} - \text{SL}| + \text{Spread} + \text{Slippage}$$

$$\text{Loss Per Standard Lot (\$)} = \text{Total Drag} \times \text{Contract Size}$$

$$\text{Position Size} = \frac{\text{Risk Capital}}{\text{Loss Per Standard Lot}}$$

### Contract Multipliers
- **Forex**: 100,000 units per standard lot ($10/pip for standard pairs).
- **Gold (XAUUSD)**: 100 troy oz per lot ($1.00 move = $100 per 1.00 lot).
- **Silver (XAGUSD)**: 5,000 troy oz per lot ($0.01 move = $50 per 1.00 lot).
- **Crypto**: 1 coin contract (fractional lots supported down to 0.01).
- **Indices**: 1 index point = $1 (broker CFD standard).
- **Stocks**: Whole share allocation = $\lfloor \text{Risk Capital} / (\text{Entry} - \text{SL}) \rfloor$.

---

## 5. Getting Started & Installation

### Step 1: Install Python
Ensure Python 3.10+ (tested on Python 3.12 64-bit) is installed and added to your system PATH:
```powershell
python --version
```

### Step 2: Create a Virtual Environment (Recommended)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Step 3: Install Dependencies
```powershell
pip install -r backend/requirements.txt
```

### Step 4: Run Automated Tests
Execute the full test suite (28 passing tests):
```powershell
pytest backend/tests
```

### Step 5: Launch FastAPI Server & Terminal
```powershell
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Open your browser to:
[http://localhost:8000](http://localhost:8000)

---

## 6. Accessing NEXORA FX on iPhone (Local Wi-Fi LAN)

Because NEXORA FX binds to `0.0.0.0:8000`, any smartphone or tablet on the same Wi-Fi network can access the terminal with zero extra software required:

1. **Find your PC's Local IP Address**:
   In PowerShell run:
   ```powershell
   ipconfig
   ```
   Look for the **IPv4 Address** of your active Wi-Fi adapter (e.g. `192.168.1.45`).

2. **Connect from iPhone**:
   - Ensure your iPhone is connected to the **same Wi-Fi network**.
   - Open **Safari** on your iPhone.
   - Navigate to: `http://192.168.1.45:8000` (substitute your PC's IP address).

3. **Install as Full-Screen Native App**:
   - In Safari, tap the **Share** button ($\boxuparrow$).
   - Scroll down and tap **Add to Home Screen** ($\boxplus$).
   - Tap **Add**. NEXORA FX will launch as a standalone, distraction-free trading terminal on your iPhone!

---

## 7. API Reference Summary

- `GET /api/health` — System status, active version, verified provider health.
- `GET /api/providers` — List of all provider capabilities, rate limits, and delays.
- `GET /api/providers/status` — Real-time latency, ping, and connection status for every provider.
- `GET /api/instruments` — Master catalogue of instruments with contract specifications.
- `GET /api/markets` — Instruments grouped by asset class with verified providers.
- `GET /api/quote?symbol=BTCUSD` — Verified live quote.
- `GET /api/candles?symbol=EURUSD&timeframe=H1` — OHLC candlestick history.
- `GET /api/analysis?symbol=XAUUSD&timeframe=M15` — Full technical analysis, indicators, SMC, and signal.
- `GET /api/scanner` — Multi-market quantitative scanner with customizable filters.
- `GET /api/signals?symbol=XAUUSD&timeframe=M15` — Active sniper signal card.
- `GET /api/mtf?symbol=XAUUSD` — 4-timeframe confluence matrix (H4, H1, M15, M5).
- `POST /api/backtest` — Chronological walk-forward backtest simulation.
- `GET /api/watchlist`, `POST /api/watchlist`, `DELETE /api/watchlist/{symbol}` — Watchlist management.
- `GET /api/journal`, `POST /api/journal`, `PUT /api/journal/{id}`, `DELETE /api/journal/{id}` — Trade journal.
- `POST /api/risk/calculate` — Position and lot sizing calculator.
