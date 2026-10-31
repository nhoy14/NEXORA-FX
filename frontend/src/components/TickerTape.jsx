/**
 * NEXORA FX — Live Ticker Tape
 * Scrolling price strip with all major symbols at the top of every page.
 */
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';

const TICKER_SYMBOLS = [
  { symbol: 'XAUUSD', label: 'Gold', cat: 'METALS' },
  { symbol: 'XAGUSD', label: 'Silver', cat: 'METALS' },
  { symbol: 'BTCUSD', label: 'Bitcoin', cat: 'CRYPTO' },
  { symbol: 'ETHUSD', label: 'Ethereum', cat: 'CRYPTO' },
  { symbol: 'EURUSD', label: 'EUR/USD', cat: 'FOREX' },
  { symbol: 'GBPUSD', label: 'GBP/USD', cat: 'FOREX' },
  { symbol: 'USDJPY', label: 'USD/JPY', cat: 'FOREX' },
  { symbol: 'US100', label: 'NASDAQ', cat: 'INDEX' },
  { symbol: 'US500', label: 'S&P500', cat: 'INDEX' },
  { symbol: 'US30', label: 'DOW', cat: 'INDEX' },
  { symbol: 'USOIL', label: 'WTI Oil', cat: 'ENERGY' },
  { symbol: 'NVDA', label: 'NVDA', cat: 'STOCK' },
  { symbol: 'AAPL', label: 'AAPL', cat: 'STOCK' },
];

function TickerItem({ item, onClick }) {
  const isUp = (item.change ?? 0) >= 0;
  return (
    <span
      onClick={() => onClick && onClick(item.symbol)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 18px',
        cursor: onClick ? 'pointer' : 'default',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
        {item.cat}
      </span>
      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{item.label}</span>
      <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
        {item.price != null
          ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: item.price > 100 ? 2 : 4 })
          : '—'}
      </span>
      <span
        className="mono"
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: isUp ? 'var(--color-buy)' : 'var(--color-sell)',
        }}
      >
        {item.change != null ? `${isUp ? '+' : ''}${item.change.toFixed(2)}%` : ''}
      </span>
    </span>
  );
}

export default function TickerTape({ onSelectSymbol }) {
  const [prices, setPrices] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);

  // Fetch prices for all symbols
  const fetchAll = async () => {
    const results = {};
    await Promise.allSettled(
      TICKER_SYMBOLS.map(async ({ symbol }) => {
        try {
          const res = await api.getQuote(symbol);
          if (res?.price) {
            results[symbol] = { price: res.price, change: res.change_pct ?? 0 };
          }
        } catch { /* ignore individual failures */ }
      })
    );
    setPrices((prev) => ({ ...prev, ...results }));
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 20000);
    return () => clearInterval(interval);
  }, []);

  // Smooth scroll animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const step = () => {
      if (!isPaused) {
        posRef.current += 0.5;
        const halfWidth = el.scrollWidth / 2;
        if (posRef.current >= halfWidth) posRef.current = 0;
        el.style.transform = `translateX(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPaused]);

  const items = TICKER_SYMBOLS.map((s) => ({
    ...s,
    price: prices[s.symbol]?.price ?? null,
    change: prices[s.symbol]?.change ?? null,
  }));

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div
      style={{
        height: '32px',
        backgroundColor: '#060912',
        borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'default',
        userSelect: 'none',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Gold left accent */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px',
        background: 'linear-gradient(to right, #060912 60%, transparent)',
        zIndex: 2, display: 'flex', alignItems: 'center', paddingLeft: '10px'
      }}>
        <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '0.1em' }}>
          LIVE
        </span>
        <span style={{
          display: 'inline-block', width: '6px', height: '6px',
          borderRadius: '50%', backgroundColor: 'var(--color-buy)',
          marginLeft: '6px', boxShadow: '0 0 6px var(--color-buy)',
          animation: 'pulse 1.2s infinite'
        }} />
      </div>

      {/* Right fade */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '40px',
        background: 'linear-gradient(to left, #060912 30%, transparent)', zIndex: 2
      }} />

      {/* Scrolling strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          paddingLeft: '90px',
          willChange: 'transform',
        }}
      >
        <div ref={scrollRef} style={{ display: 'inline-flex', alignItems: 'center', height: '100%' }}>
          {doubled.map((item, i) => (
            <TickerItem key={`${item.symbol}-${i}`} item={item} onClick={onSelectSymbol} />
          ))}
        </div>
      </div>
    </div>
  );
}

