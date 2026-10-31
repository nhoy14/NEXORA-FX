import React, { useState } from 'react';
import {
  Globe2,
  TrendingUp,
  TrendingDown,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Search
} from 'lucide-react';

export default function AllMarketsPage({ onSelectSymbol, onNavigateTab }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  const marketAssets = [
    // Metals
    { symbol: 'XAUUSD', name: 'Gold Spot / US Dollar', cat: 'METALS', price: 3876.24, change: 0.42, rsi: 52.4, feeds: ['mt5', 'binance', 'yahoo', 'xaus'] },
    { symbol: 'XAGUSD', name: 'Silver Spot / US Dollar', cat: 'METALS', price: 49.13, change: 1.15, rsi: 58.1, feeds: ['mt5', 'yahoo'] },

    // Crypto
    { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', cat: 'CRYPTO', price: 76663.21, change: -5.23, rsi: 38.6, feeds: ['binance', 'kraken', 'mt5'] },
    { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', cat: 'CRYPTO', price: 2233.68, change: -4.42, rsi: 41.2, feeds: ['binance', 'kraken', 'mt5'] },
    { symbol: 'SOLUSD', name: 'Solana / US Dollar', cat: 'CRYPTO', price: 94.58, change: -3.62, rsi: 46.5, feeds: ['binance', 'kraken'] },
    { symbol: 'BNB', name: 'Binance Coin', cat: 'CRYPTO', price: 698.42, change: -6.27, rsi: 39.8, feeds: ['binance'] },
    { symbol: 'XRP', name: 'Ripple XRP', cat: 'CRYPTO', price: 1.2478, change: -3.05, rsi: 44.0, feeds: ['binance', 'kraken'] },

    // Forex
    { symbol: 'EURUSD', name: 'Euro / US Dollar', cat: 'FOREX', price: 1.1166, change: 0.18, rsi: 54.2, feeds: ['mt5', 'yahoo', 'twelve_data'] },
    { symbol: 'GBPUSD', name: 'British Pound / US Dollar', cat: 'FOREX', price: 1.3394, change: -0.22, rsi: 48.9, feeds: ['mt5', 'yahoo', 'twelve_data'] },
    { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', cat: 'FOREX', price: 157.558, change: 0.35, rsi: 61.4, feeds: ['mt5', 'yahoo'] },
    { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', cat: 'FOREX', price: 0.8241, change: -0.05, rsi: 47.1, feeds: ['mt5', 'yahoo'] },
    { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', cat: 'FOREX', price: 1.3966, change: 0.12, rsi: 53.0, feeds: ['mt5', 'yahoo'] },
    { symbol: 'AUDUSD', name: 'Australian Dollar / USD', cat: 'FOREX', price: 0.7029, change: -0.15, rsi: 46.8, feeds: ['mt5', 'yahoo'] },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar / USD', cat: 'FOREX', price: 0.5631, change: 0.08, rsi: 50.2, feeds: ['mt5', 'yahoo'] },

    // Indices
    { symbol: 'US100', name: 'Nasdaq 100 Index', cat: 'INDICES', price: 28293.69, change: 0.65, rsi: 56.4, feeds: ['yahoo', 'twelve_data'] },
    { symbol: 'US500', name: 'S&P 500 Index', cat: 'INDICES', price: 7544.37, change: 0.45, rsi: 54.8, feeds: ['yahoo', 'twelve_data'] },
    { symbol: 'US30', name: 'Dow Jones 30 Index', cat: 'INDICES', price: 51687.5, change: 0.32, rsi: 52.1, feeds: ['mt5', 'yahoo'] },
    { symbol: 'GER40', name: 'DAX 40 Index (Germany)', cat: 'INDICES', price: 25817.48, change: 0.82, rsi: 63.5, feeds: ['yahoo'] },
    { symbol: 'JP225', name: 'Nikkei 225 Index (Japan)', cat: 'INDICES', price: 62140.0, change: 1.25, rsi: 68.2, feeds: ['mt5', 'yahoo'] },

    // Stocks
    { symbol: 'NVDA', name: 'Nvidia Corp.', cat: 'STOCKS', price: 282.76, change: 1.45, rsi: 65.2, feeds: ['yahoo'] },
    { symbol: 'AAPL', name: 'Apple Inc.', cat: 'STOCKS', price: 344.8, change: 0.25, rsi: 51.0, feeds: ['yahoo'] },
    { symbol: 'MSFT', name: 'Microsoft Corp.', cat: 'STOCKS', price: 523.14, change: 0.40, rsi: 53.8, feeds: ['yahoo'] },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', cat: 'STOCKS', price: 239.58, change: -0.15, rsi: 48.2, feeds: ['yahoo'] },
    { symbol: 'TSLA', name: 'Tesla Inc.', cat: 'STOCKS', price: 398.25, change: 2.10, rsi: 59.4, feeds: ['yahoo'] },

    // Commodities
    { symbol: 'USOIL', name: 'Crude Oil (WTI)', cat: 'COMMODITIES', price: 71.45, change: -0.38, rsi: 45.6, feeds: ['mt5', 'yahoo'] }
  ];

  const categories = [
    { id: 'ALL', label: 'All Assets' },
    { id: 'FOREX', label: 'Forex' },
    { id: 'METALS', label: 'Metals' },
    { id: 'CRYPTO', label: 'Crypto' },
    { id: 'INDICES', label: 'Indices' },
    { id: 'STOCKS', label: 'Stocks' },
    { id: 'COMMODITIES', label: 'Commodities' }
  ];

  const filteredAssets = marketAssets.filter((a) => {
    const matchCat = activeCategory === 'ALL' || a.cat === activeCategory;
    const matchSearch =
      !search ||
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOpenTerminal = (sym) => {
    onSelectSymbol(sym);
    onNavigateTab('crazii_chart');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Category Bar & Search */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <Globe2 size={15} color="var(--gold-primary)" />
            GLOBAL MARKETS HUB
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Verified Real Feeds Across All Asset Classes
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Categories Tab Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeCategory === c.id ? 'var(--gold-primary)' : 'transparent',
                  color: activeCategory === c.id ? '#070a12' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="Search symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '30px' }}
            />
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          </div>
        </div>
      </div>

      {/* 2. Asset Cards Grid (Rectangular & Luxury) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px'
        }}
      >
        {filteredAssets.map((asset) => {
          const isUp = asset.change >= 0;
          return (
            <div
              key={asset.symbol}
              className="nx-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '14px',
                gap: '10px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="mono" style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                      {asset.symbol}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '1px' }}>
                      {asset.name}
                    </div>
                  </div>
                  <span className="badge badge-dim">{asset.cat}</span>
                </div>

                {/* Price & Change */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '12px' }}>
                  <span className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                    {asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: isUp ? 'var(--color-buy)' : 'var(--color-sell)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {isUp ? '+' : ''}{asset.change.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Feeds tag & Action Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={11} color="var(--gold-primary)" />
                  <span style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>
                    {asset.feeds.slice(0, 2).join(', ')}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenTerminal(asset.symbol)}
                  className="btn btn-outline-gold"
                  style={{ padding: '4px 10px', fontSize: '10.5px' }}
                >
                  Analyze & Trade <ChevronRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
