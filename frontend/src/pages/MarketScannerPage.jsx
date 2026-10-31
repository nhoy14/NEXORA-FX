import React, { useState, useEffect } from 'react';
import {
  ScanLine,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api.js';

export default function MarketScannerPage({ onSelectSymbol, onNavigateTab }) {
  const [assetClass, setAssetClass] = useState('');
  const [timeframe, setTimeframe] = useState('H1');
  const [signalFilter, setSignalFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerItems, setScannerItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);

  const fetchScan = async () => {
    setIsLoading(true);
    try {
      const data = await api.getScanner({
        assetClass: assetClass || undefined,
        timeframe,
        signal: signalFilter || undefined,
        minScore: minScore > 0 ? minScore : undefined
      });
      setScannerItems(data?.results || data?.items || []);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, [assetClass, timeframe, signalFilter, minScore]);

  // Client-side search filter
  const filteredItems = scannerItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.symbol.toLowerCase().includes(q) ||
      (item.asset_class && item.asset_class.toLowerCase().includes(q))
    );
  });

  const handleTradeClick = (sym) => {
    onSelectSymbol(sym);
    onNavigateTab('crazii_chart');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Filter Deck */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <ScanLine size={15} color="var(--gold-primary)" />
            MULTI-MARKET QUANTITATIVE SCANNER
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Real-Time Screener Across All Asset Classes
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr)) 1fr auto',
            gap: '10px',
            alignItems: 'end'
          }}
        >
          {/* Asset Class Filter */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Asset Class
            </label>
            <select value={assetClass} onChange={(e) => setAssetClass(e.target.value)}>
              <option value="">All Asset Classes</option>
              <option value="FOREX">Forex Currencies</option>
              <option value="METALS">Precious Metals</option>
              <option value="CRYPTO">Crypto 24/7</option>
              <option value="INDICES">World Indices</option>
              <option value="STOCKS">Equities / Stocks</option>
              <option value="COMMODITIES">Commodities</option>
            </select>
          </div>

          {/* Timeframe Filter */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Timeframe
            </label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
              <option value="M5">M5 (Scalp)</option>
              <option value="M15">M15 (Sniper)</option>
              <option value="H1">H1 (Structure)</option>
              <option value="H4">H4 (Macro)</option>
              <option value="D1">D1 (Daily)</option>
            </select>
          </div>

          {/* Signal Filter */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Signal Filter
            </label>
            <select value={signalFilter} onChange={(e) => setSignalFilter(e.target.value)}>
              <option value="">All Signals</option>
              <option value="BUY">BUY Only</option>
              <option value="SELL">SELL Only</option>
              <option value="WAIT">WAIT Only</option>
            </select>
          </div>

          {/* Min Score Filter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>
              <span>MIN SCORE</span>
              <span className="mono text-gold">{minScore}/100</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              style={{ padding: '0', height: '24px', cursor: 'pointer' }}
            />
          </div>

          {/* Search Box */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Search Symbol
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g. XAUUSD, BTC, NVDA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '30px' }}
              />
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchScan}
            disabled={isLoading}
            className="btn btn-gold"
            style={{ height: '35px', padding: '0 16px' }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Scan Now</span>
          </button>
        </div>
      </div>

      {/* 2. Scanner Results Table */}
      <div className="nx-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th>ASSET</th>
                <th>PRICE</th>
                <th>FEED / DELAY</th>
                <th>EMA TREND</th>
                <th>RSI (14)</th>
                <th>STRUCTURE</th>
                <th>SMC PATTERN</th>
                <th>SIGNAL</th>
                <th>SCORE</th>
                <th>ENTRY / SL / TP</th>
                <th style={{ textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    {isLoading ? 'Scanning all live financial feeds...' : 'No instruments matched current scanner filters.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isBuy = item.signal === 'BUY';
                  const isSell = item.signal === 'SELL';
                  const rsiVal = item.rsi != null ? item.rsi : 50;

                  return (
                    <tr key={item.symbol}>
                      {/* Symbol */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="mono" style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                            {item.symbol}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                            {item.name || item.symbol}
                          </span>
                        </div>
                      </td>

                      {/* Asset Class */}
                      <td>
                        <span className="badge badge-dim">{item.asset_class || 'FOREX'}</span>
                      </td>

                      {/* Price */}
                      <td>
                        <span className="mono" style={{ fontWeight: 600, color: '#fff' }}>
                          {item.price ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '--'}
                        </span>
                      </td>

                      {/* Feed */}
                      <td>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                          {item.feed_info || item.provider || 'MT5 IPC 0ms'}
                        </span>
                      </td>

                      {/* EMA Trend */}
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: item.ema_trend === 'BULLISH' ? 'var(--color-buy)' : item.ema_trend === 'BEARISH' ? 'var(--color-sell)' : 'var(--text-dim)'
                          }}
                        >
                          {item.ema_trend || 'NEUTRAL'}
                        </span>
                      </td>

                      {/* RSI */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono" style={{ fontSize: '11px' }}>
                            {rsiVal.toFixed(1)}
                          </span>
                          <div style={{ width: '36px', height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, rsiVal))}%`,
                                height: '100%',
                                backgroundColor: rsiVal > 70 ? 'var(--color-sell)' : rsiVal < 30 ? 'var(--color-buy)' : 'var(--gold-primary)'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Market Structure */}
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: item.structure === 'BULLISH' ? 'var(--color-buy)' : item.structure === 'BEARISH' ? 'var(--color-sell)' : 'var(--text-dim)'
                          }}
                        >
                          {item.structure || 'RANGING'}
                        </span>
                      </td>

                      {/* SMC Pattern */}
                      <td>
                        <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                          {item.smc_pattern || 'CHoCH_BULLISH'}
                        </span>
                      </td>

                      {/* Signal */}
                      <td>
                        <span className={`badge ${isBuy ? 'badge-buy' : isSell ? 'badge-sell' : 'badge-wait'}`}>
                          {item.signal || 'WAIT'}
                        </span>
                      </td>

                      {/* Score */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono text-gold" style={{ fontWeight: 700 }}>
                            {item.score || 70}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>/100</span>
                        </div>
                      </td>

                      {/* Entry / SL / TP */}
                      <td>
                        <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          E: {item.entry ? item.entry.toFixed(2) : '--'} | SL: {item.sl ? item.sl.toFixed(2) : '--'}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleTradeClick(item.symbol)}
                          className="btn btn-outline-gold"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          Trade <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
