/**
 * NEXORA FX — API Service Layer
 * Centralized, typed HTTP client for all backend communication.
 * Connects to FastAPI backend running on port 8000.
 */

const API_BASE = '/api';

async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Health & Providers
  getHealth: () => fetchJson('/health'),
  getProvidersStatus: () => fetchJson('/providers/status'),
  getDataSources: () => fetchJson('/data-sources'),
  setProvider: (provider) => fetchJson(`/market/provider?provider=${encodeURIComponent(provider)}`, { method: 'POST' }),

  // Markets & Instruments
  getMarkets: () => fetchJson('/markets'),
  getInstruments: () => fetchJson('/instruments'),
  getQuote: (symbol) => fetchJson(`/quote?symbol=${encodeURIComponent(symbol)}`),
  getMarketSymbol: (symbol) => fetchJson(`/market/${encodeURIComponent(symbol)}`),

  // Candles & Technical Analysis
  getCandles: (symbol, timeframe = 'M15', limit = 200) => 
    fetchJson(`/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`),
  getAnalysis: (symbol, timeframe = 'M15', provider = null) => {
    let url = `/analysis?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`;
    if (provider) url += `&provider=${encodeURIComponent(provider)}`;
    return fetchJson(url);
  },
  getCrazii: (symbol, timeframe = 'M15') =>
    fetchJson(`/crazii?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  getSignals: (symbol, timeframe = 'M15') =>
    fetchJson(`/signals?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  getEmaAnalysis: (symbol, timeframe = 'M15') =>
    fetchJson(`/ema/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`),
  getMsnrAnalysis: (symbol, timeframe = 'M15') =>
    fetchJson(`/msnr/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`),
  getMtfMatrix: (symbol) => fetchJson(`/multi-timeframe/${encodeURIComponent(symbol)}`),

  // Global Order Flow & Real-time Trades
  getWorldTrades: (symbol, limit = 50) => fetchJson(`/world-trades/${encodeURIComponent(symbol)}?limit=${limit}`),
  getOrderbook: (symbol, limit = 20) => fetchJson(`/orderbook/${encodeURIComponent(symbol)}?limit=${limit}`),

  // Scanner
  getScanner: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.assetClass) qs.set('asset_class', params.assetClass);
    if (params.timeframe) qs.set('timeframe', params.timeframe);
    if (params.signal) qs.set('signal_filter', params.signal);
    if (params.minScore) qs.set('min_score', params.minScore);
    const query = qs.toString();
    return fetchJson(`/scanner${query ? `?${query}` : ''}`);
  },

  // Risk Calculator
  calculateRisk: (payload) =>
    fetchJson('/risk/calculate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Backtester
  runBacktest: (payload) =>
    fetchJson('/backtest/run', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getBacktestHistory: () => fetchJson('/backtest/history'),

  // Trade Journal
  getJournal: () => fetchJson('/journal'),
  addJournalEntry: (entry) =>
    fetchJson('/journal', {
      method: 'POST',
      body: JSON.stringify(entry)
    }),
  updateJournalEntry: (id, entry) =>
    fetchJson(`/journal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry)
    }),
  deleteJournalEntry: (id) =>
    fetchJson(`/journal/${id}`, {
      method: 'DELETE'
    }),

  // Watchlist
  getWatchlist: () => fetchJson('/watchlist'),
  addToWatchlist: (item) =>
    fetchJson('/watchlist', {
      method: 'POST',
      body: JSON.stringify(item)
    }),
  removeFromWatchlist: (symbol) =>
    fetchJson(`/watchlist/${encodeURIComponent(symbol)}`, {
      method: 'DELETE'
    }),

  // Screenshot Analysis
  analyzeScreenshot: (payload) =>
    fetchJson('/screenshot/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Settings
  getSettings: () => fetchJson('/settings'),
  updateSettings: (settings) =>
    fetchJson('/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    }),

  // Telegram Alerts
  testTelegram: (payload) =>
    fetchJson('/telegram/test', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  sendTelegramSignal: (symbol, timeframe) =>
    fetchJson(`/telegram/send-signal?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`, {
      method: 'POST'
    })
};
