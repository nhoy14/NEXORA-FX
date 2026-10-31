import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Clock, ShieldCheck, ChevronDown, Check, Volume2, VolumeX } from 'lucide-react';
import PriceAlerts from './PriceAlerts.jsx';
import { audioAlerts } from '../utils/audioAlerts.js';

export default function TopHeader({
  symbol,
  onSelectSymbol,
  timeframe,
  onSelectTimeframe,
  marketData,
  onRefresh,
  isRefreshing
}) {
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false);
  const [prevPrice, setPrevPrice] = useState(null);
  const [priceFlash, setPriceFlash] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(audioAlerts.isEnabled());

  const availableSymbols = [
    { symbol: 'XAUUSD', name: 'Gold Spot / USD', cat: 'Metals' },
    { symbol: 'BTCUSD', name: 'Bitcoin / USD', cat: 'Crypto' },
    { symbol: 'EURUSD', name: 'Euro / US Dollar', cat: 'Forex' },
    { symbol: 'GBPUSD', name: 'British Pound / USD', cat: 'Forex' },
    { symbol: 'USDJPY', name: 'USD / Japanese Yen', cat: 'Forex' },
    { symbol: 'US100', name: 'Nasdaq 100 Index', cat: 'Indices' },
    { symbol: 'US30', name: 'Dow Jones 30 Index', cat: 'Indices' },
    { symbol: 'NVDA', name: 'Nvidia Corp.', cat: 'Stocks' },
    { symbol: 'AAPL', name: 'Apple Inc.', cat: 'Stocks' },
    { symbol: 'USOIL', name: 'Crude Oil (WTI)', cat: 'Commodities' },
  ];

  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

  const currentPrice = marketData?.latest_price || marketData?.price || 0;
  const changePct = marketData?.change_pct || 0;
  const isUp = changePct >= 0;

  useEffect(() => {
    if (prevPrice !== null && currentPrice !== prevPrice) {
      setPriceFlash(currentPrice > prevPrice ? 'up' : 'down');
      const timer = setTimeout(() => setPriceFlash(null), 800);
      return () => clearTimeout(timer);
    }
    setPrevPrice(currentPrice);
  }, [currentPrice]);

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'relative',
        zIndex: 30,
        gap: '12px'
      }}
    >
      {/* Left: Symbol Selector & Live Quote */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Symbol Selector Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--gold-border)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <span style={{ color: 'var(--gold-primary)' }}>★</span>
            <span className="mono">{symbol}</span>
            <ChevronDown size={14} color="var(--text-dim)" />
          </button>

          {symbolDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '240px',
                backgroundColor: '#0c1220',
                border: '1px solid var(--gold-border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-card)',
                zIndex: 100,
                padding: '6px 0',
                maxHeight: '320px',
                overflowY: 'auto'
              }}
            >
              <div style={{ padding: '4px 12px', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                Select Financial Asset
              </div>
              {availableSymbols.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => {
                    onSelectSymbol(item.symbol);
                    setSymbolDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    backgroundColor: item.symbol === symbol ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                    color: item.symbol === symbol ? 'var(--gold-primary)' : '#fff'
                  }}
                  onMouseEnter={(e) => {
                    if (item.symbol !== symbol) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (item.symbol !== symbol) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="mono" style={{ fontWeight: 600 }}>{item.symbol}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{item.cat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Price Display */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            className="mono"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: priceFlash === 'up' ? 'var(--color-buy)' : priceFlash === 'down' ? 'var(--color-sell)' : '#fff',
              transition: 'color 0.2s ease'
            }}
          >
            {currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '--.--'}
          </span>
          <span
            className="mono"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: isUp ? 'var(--color-buy)' : 'var(--color-sell)'
            }}
          >
            {isUp ? '+' : ''}{changePct ? changePct.toFixed(2) : '0.00'}%
          </span>
        </div>

        {/* Spread badge if present */}
        {marketData?.spread != null && (
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px' }}>
            SPR: <span className="mono text-gold">{marketData.spread.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Center: Timeframe Selector */}
      <div className="scrollable-ribbon" style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--bg-app)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', maxWidth: '280px', overflowX: 'auto' }}>
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => onSelectTimeframe(tf)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '2px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: timeframe === tf ? 'var(--gold-primary)' : 'transparent',
              color: timeframe === tf ? '#070a12' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Right: Data Feed Badge, Refresh & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Feed Info (Hidden on very small phones to save space) */}
        <div
          className="hide-on-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(212, 175, 55, 0.08)',
            border: '1px solid var(--gold-border)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '10.5px'
          }}
        >
          <Zap size={12} color="var(--gold-primary)" />
          <span style={{ color: 'var(--text-muted)' }}>FEED:</span>
          <span className="mono" style={{ color: 'var(--gold-primary)', fontWeight: 600 }}>
            {marketData?.provider ? marketData.provider.toUpperCase() : 'VERIFIED MT5 IPC'}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-subtle"
          style={{ padding: '6px 10px', fontSize: '11px' }}
          title="Refresh live data"
        >
          <RefreshCw
            size={13}
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              transition: 'transform 0.2s'
            }}
          />
          <span>Refresh</span>
        </button>

        {/* Audio AI Voice & Alerts Toggle */}
        <button
          onClick={() => {
            const next = audioAlerts.toggle();
            setSoundEnabled(next);
            if (next) {
              audioAlerts.speak("Audio alerts enabled");
            }
          }}
          className="btn btn-subtle"
          style={{
            padding: '6px 9px',
            fontSize: '11px',
            color: soundEnabled ? 'var(--cyan-neon)' : 'var(--text-dim)',
            borderColor: soundEnabled ? 'rgba(0, 229, 255, 0.3)' : 'var(--border-subtle)'
          }}
          title={soundEnabled ? 'AI Voice & Sound Chimes Active (Click to Mute)' : 'Audio Muted (Click to Enable)'}
        >
          {soundEnabled ? <Volume2 size={13} color="var(--cyan-neon)" /> : <VolumeX size={13} />}
          <span className="hide-on-mobile">{soundEnabled ? 'SOUND ON' : 'MUTED'}</span>
        </button>

        {/* Price Alerts */}
        <PriceAlerts symbol={symbol} currentPrice={currentPrice} />

        {/* System Online Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-buy)',
            padding: '4px 8px',
            background: 'var(--color-buy-bg)',
            border: '1px solid var(--color-buy-border)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <span className="live-pulse-dot" />
          <span>ONLINE • 0ms</span>
        </div>
      </div>
    </header>
  );
}
