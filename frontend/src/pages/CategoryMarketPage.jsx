import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  DollarSign,
  Gem,
  Coins,
  Briefcase,
  Flame,
  Activity
} from 'lucide-react';

export default function CategoryMarketPage({ categoryId, onSelectSymbol, onNavigateTab }) {
  const metaByCategory = {
    forex: {
      title: 'FOREX CURRENCIES HUB',
      icon: DollarSign,
      description: 'Major & Minor FX Pairs with Direct MT5 Interbank Spreads & Institutional Flow',
      items: [
        { symbol: 'EURUSD', name: 'Euro / US Dollar', price: 1.1166, change: 0.18, spread: 0.1, vol: '1.2M Lots', bias: 'BULLISH' },
        { symbol: 'GBPUSD', name: 'British Pound / US Dollar', price: 1.3394, change: -0.22, spread: 0.3, vol: '890K Lots', bias: 'BEARISH' },
        { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', price: 157.558, change: 0.35, spread: 0.2, vol: '1.4M Lots', bias: 'BULLISH' },
        { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', price: 0.8241, change: -0.05, spread: 0.2, vol: '420K Lots', bias: 'NEUTRAL' },
        { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', price: 1.3966, change: 0.12, spread: 0.3, vol: '510K Lots', bias: 'BULLISH' },
        { symbol: 'AUDUSD', name: 'Australian Dollar / USD', price: 0.7029, change: -0.15, spread: 0.2, vol: '630K Lots', bias: 'BEARISH' },
        { symbol: 'NZDUSD', name: 'New Zealand Dollar / USD', price: 0.5631, change: 0.08, spread: 0.3, vol: '290K Lots', bias: 'NEUTRAL' },
        { symbol: 'EURJPY', name: 'Euro / Japanese Yen', price: 175.942, change: 0.52, spread: 0.4, vol: '720K Lots', bias: 'BULLISH' },
        { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', price: 211.037, change: 0.14, spread: 0.6, vol: '680K Lots', bias: 'BULLISH' }
      ]
    },
    metals: {
      title: 'PRECIOUS METALS HUB',
      icon: Gem,
      description: 'Gold & Silver Spot Institutional Desks with London Fix & COMEX Futures Correlation',
      items: [
        { symbol: 'XAUUSD', name: 'Gold Spot / US Dollar (100 oz)', price: 3876.24, change: 0.42, spread: 0.15, vol: '3.4M Oz', bias: 'BULLISH' },
        { symbol: 'XAGUSD', name: 'Silver Spot / US Dollar (5,000 oz)', price: 49.13, change: 1.15, spread: 0.02, vol: '1.8M Oz', bias: 'BULLISH' }
      ]
    },
    crypto: {
      title: '24/7 CRYPTO LIQUIDITY HUB',
      icon: Coins,
      description: 'High-Frequency Binance & Kraken Real-Time Spot & Perpetual Order Book Streams',
      items: [
        { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', price: 76663.21, change: -5.23, spread: 1.5, vol: '$18.4B', bias: 'BEARISH' },
        { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', price: 2233.68, change: -4.42, spread: 0.4, vol: '$9.2B', bias: 'BEARISH' },
        { symbol: 'SOLUSD', name: 'Solana / US Dollar', price: 94.58, change: -3.62, spread: 0.05, vol: '$3.1B', bias: 'BEARISH' },
        { symbol: 'BNB', name: 'Binance Coin', price: 698.42, change: -6.27, spread: 0.2, vol: '$1.4B', bias: 'BEARISH' },
        { symbol: 'XRP', name: 'Ripple XRP', price: 1.2478, change: -3.05, spread: 0.001, vol: '$820M', bias: 'BEARISH' }
      ]
    },
    indices: {
      title: 'WORLD EQUITY INDICES HUB',
      icon: TrendingUp,
      description: 'Institutional Benchmarks for Wall Street, European & Asian Equity Markets',
      items: [
        { symbol: 'US100', name: 'Nasdaq 100 Index', price: 28293.69, change: 0.65, spread: 1.0, vol: 'High', bias: 'BULLISH' },
        { symbol: 'US500', name: 'S&P 500 Index', price: 7544.37, change: 0.45, spread: 0.4, vol: 'Ultra', bias: 'BULLISH' },
        { symbol: 'US30', name: 'Dow Jones 30 Index', price: 51687.5, change: 0.32, spread: 2.0, vol: 'High', bias: 'BULLISH' },
        { symbol: 'GER40', name: 'DAX 40 Index (Germany)', price: 25817.48, change: 0.82, spread: 1.5, vol: 'Moderate', bias: 'BULLISH' },
        { symbol: 'JP225', name: 'Nikkei 225 Index (Japan)', price: 62140.0, change: 1.25, spread: 5.0, vol: 'High', bias: 'BULLISH' }
      ]
    },
    stocks: {
      title: 'EQUITIES & TECH LEADERS',
      icon: Briefcase,
      description: 'Mega-Cap Technology & Growth Stocks with Real-Time Public Exchange Quotes',
      items: [
        { symbol: 'NVDA', name: 'Nvidia Corp.', price: 282.76, change: 1.45, spread: 0.05, vol: '48M Shares', bias: 'BULLISH' },
        { symbol: 'AAPL', name: 'Apple Inc.', price: 344.8, change: 0.25, spread: 0.04, vol: '32M Shares', bias: 'BULLISH' },
        { symbol: 'MSFT', name: 'Microsoft Corp.', price: 523.14, change: 0.4, spread: 0.06, vol: '18M Shares', bias: 'BULLISH' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 239.58, change: -0.15, spread: 0.04, vol: '24M Shares', bias: 'NEUTRAL' },
        { symbol: 'TSLA', name: 'Tesla Inc.', price: 398.25, change: 2.1, spread: 0.08, vol: '42M Shares', bias: 'BULLISH' }
      ]
    },
    commodities: {
      title: 'COMMODITIES & ENERGY HUB',
      icon: Flame,
      description: 'Crude Oil, Natural Gas and Strategic Resources with Geopolitical Risk Models',
      items: [
        { symbol: 'USOIL', name: 'WTI Crude Oil Spot', price: 71.45, change: -0.38, spread: 0.03, vol: '840K Bbls', bias: 'NEUTRAL' },
        { symbol: 'XAUUSD', name: 'Gold Bullion', price: 3876.24, change: 0.42, spread: 0.15, vol: 'High', bias: 'BULLISH' }
      ]
    }
  };

  const currentHub = metaByCategory[categoryId] || metaByCategory.forex;
  const Icon = currentHub.icon;

  const handleTrade = (sym) => {
    onSelectSymbol(sym);
    onNavigateTab('crazii_chart');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* Header Deck */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <Icon size={16} color="var(--gold-primary)" />
            {currentHub.title}
          </span>
          <span className="badge badge-gold">VERIFIED LIQUIDITY</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currentHub.description}</p>
      </div>

      {/* Asset Table / Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {currentHub.items.map((item) => {
          const isUp = item.change >= 0;
          return (
            <div
              key={item.symbol}
              className="nx-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '14px',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                      {item.symbol}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{item.name}</div>
                  </div>
                  <span
                    className={`badge ${
                      item.bias === 'BULLISH' ? 'badge-buy' : item.bias === 'BEARISH' ? 'badge-sell' : 'badge-wait'
                    }`}
                  >
                    {item.bias}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '14px' }}>
                  <span className="mono" style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                    {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isUp ? 'var(--color-buy)' : 'var(--color-sell)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {isUp ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Spread & Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '11px'
                }}
              >
                <div style={{ display: 'flex', gap: '10px', color: 'var(--text-dim)' }}>
                  <span>SPR: <strong className="mono text-gold">{item.spread}</strong></span>
                  <span>VOL: <strong className="mono">{item.vol}</strong></span>
                </div>

                <button
                  onClick={() => handleTrade(item.symbol)}
                  className="btn btn-outline-gold"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  Trade <ChevronRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
