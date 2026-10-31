import React, { useState, useEffect, useRef } from 'react';
import {
  Globe2,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Zap,
  RefreshCw,
  Sliders,
  DollarSign,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api.js';

const AVAILABLE_PAIRS = [
  { symbol: 'XAUUSD', name: 'Gold Spot / USD', cat: 'Metals' },
  { symbol: 'BTCUSD', name: 'Bitcoin / USD', cat: 'Crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum / USD', cat: 'Crypto' },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', cat: 'Forex' },
  { symbol: 'GBPUSD', name: 'British Pound / USD', cat: 'Forex' },
  { symbol: 'USDJPY', name: 'USD / Japanese Yen', cat: 'Forex' },
  { symbol: 'US100', name: 'Nasdaq 100 Index', cat: 'Indices' },
  { symbol: 'USOIL', name: 'Crude Oil (WTI)', cat: 'Commodities' }
];

export default function GlobalOrderFlowPage({ onSelectSymbol, onNavigateTab }) {
  const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD');
  const [tradesData, setTradesData] = useState(null);
  const [orderbookData, setOrderbookData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoStream, setAutoStream] = useState(true);
  const [filterLargeOnly, setFilterLargeOnly] = useState(false);

  const fetchData = async () => {
    try {
      const [trades, orderbook] = await Promise.allSettled([
        api.getWorldTrades(selectedSymbol, 60),
        api.getOrderbook(selectedSymbol, 15)
      ]);
      if (trades.status === 'fulfilled') setTradesData(trades.value);
      if (orderbook.status === 'fulfilled') setOrderbookData(orderbook.value);
    } catch (err) {
      console.error('World trades fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
    let timer = null;
    if (autoStream) {
      // Poll every 3 seconds for near real-time order execution flow
      timer = setInterval(fetchData, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [selectedSymbol, autoStream]);

  const trades = tradesData?.trades || [];
  const filteredTrades = filterLargeOnly ? trades.filter(t => t.is_large) : trades;
  const buyRatio = tradesData?.global_buy_ratio ?? 50.0;
  const sellRatio = tradesData?.global_sell_ratio ?? 50.0;
  const latestPrice = tradesData?.latest_price || trades[0]?.price || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
      {/* 1. Header & Controls */}
      <div
        className="nx-card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(212, 175, 55, 0.2) 100%)',
              border: '1px solid var(--gold-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Globe2 size={20} color="var(--cyan-neon)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                Global Market Participant Order Flow
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                WORLDWIDE LIVE TRADES
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Real execution ticks, buyer vs. seller positioning, and institutional block orders across global exchanges.
            </div>
          </div>
        </div>

        {/* Pair selector & Auto Stream toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={selectedSymbol}
            onChange={e => setSelectedSymbol(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-input)',
              color: '#fff',
              border: '1px solid var(--gold-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {AVAILABLE_PAIRS.map(p => (
              <option key={p.symbol} value={p.symbol} style={{ backgroundColor: '#090e1a' }}>
                {p.symbol} — {p.name}
              </option>
            ))}
          </select>

          {/* Large Orders Filter */}
          <button
            onClick={() => setFilterLargeOnly(!filterLargeOnly)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid',
              borderColor: filterLargeOnly ? 'var(--gold-primary)' : 'var(--border-subtle)',
              backgroundColor: filterLargeOnly ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: filterLargeOnly ? 'var(--gold-primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            Whale Trades Only ($25k+)
          </button>

          {/* Stream Live status */}
          <button
            onClick={() => setAutoStream(!autoStream)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid',
              borderColor: autoStream ? 'var(--color-buy-border)' : 'var(--border-subtle)',
              backgroundColor: autoStream ? 'var(--color-buy-bg)' : 'transparent',
              color: autoStream ? 'var(--color-buy)' : 'var(--text-dim)',
              cursor: 'pointer'
            }}
          >
            <span className={autoStream ? "live-pulse-dot" : ""} style={{ width: '7px', height: '7px' }} />
            {autoStream ? 'LIVE STREAMING' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* 2. Sentiment Gauge Bar (Global Buyer vs Seller % on Earth) */}
      <div className="nx-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={15} color="var(--gold-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              GLOBAL REAL-TIME SENTIMENT & BUY/SELL DELTA ({selectedSymbol})
            </span>
          </div>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Latest Traded Price: <strong style={{ color: '#fff' }}>${latestPrice > 100 ? latestPrice.toFixed(2) : latestPrice.toFixed(4)}</strong>
          </span>
        </div>

        {/* Ratio Dual Bar */}
        <div style={{ height: '24px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '4px', display: 'flex', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              width: `${buyRatio}%`,
              backgroundColor: 'var(--color-buy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '10px',
              fontWeight: 800,
              fontSize: '11px',
              color: '#070a12',
              transition: 'width 0.4s ease'
            }}
          >
            BUYERS {buyRatio}%
          </div>
          <div
            style={{
              width: `${sellRatio}%`,
              backgroundColor: 'var(--color-sell)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '10px',
              fontWeight: 800,
              fontSize: '11px',
              color: '#fff',
              transition: 'width 0.4s ease'
            }}
          >
            SELLERS {sellRatio}%
          </div>
        </div>

        {/* Volumes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px' }}>
          <span style={{ color: 'var(--color-buy)', fontWeight: 600 }}>
            Buy Execution Volume: ${(tradesData?.buy_volume_usd || 0).toLocaleString()}
          </span>
          <span style={{ color: 'var(--color-sell)', fontWeight: 600 }}>
            Sell Execution Volume: ${(tradesData?.sell_volume_usd || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3. Main Grid: Real-Time World Trades Tape (Left) + Orderbook Depth (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', minHeight: '520px' }}>
        {/* World Execution Tape */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: '#090e1a',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={14} color="var(--gold-primary)" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                LIVE WORLD TRADE EXECUTION STREAM (TICKS)
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              {filteredTrades.length} Trades Captured
            </span>
          </div>

          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '85px 75px 1fr 1fr 1fr 70px',
              padding: '8px 14px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderBottom: '1px solid var(--border-subtle)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-dim)',
              textTransform: 'uppercase'
            }}
          >
            <span>Time (UTC)</span>
            <span>Side</span>
            <span>Execution Price</span>
            <span>Filled Size</span>
            <span>Total USD</span>
            <span style={{ textAlign: 'right' }}>Type</span>
          </div>

          {/* Trades Rows */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '480px' }}>
            {filteredTrades.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                Awaiting incoming execution ticks...
              </div>
            ) : (
              filteredTrades.map(trade => {
                const isBuy = trade.side === 'BUY';
                return (
                  <div
                    key={trade.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '85px 75px 1fr 1fr 1fr 70px',
                      padding: '8px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      backgroundColor: trade.is_large ? (isBuy ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 51, 102, 0.08)') : 'transparent',
                      alignItems: 'center',
                      fontSize: '11px'
                    }}
                  >
                    <span className="mono" style={{ color: 'var(--text-dim)', fontSize: '10.5px' }}>
                      {trade.time}
                    </span>
                    <span
                      style={{
                        color: isBuy ? 'var(--color-buy)' : 'var(--color-sell)',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      {isBuy ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {trade.side}
                    </span>
                    <span className="mono" style={{ fontWeight: 600, color: '#fff' }}>
                      ${trade.price > 100 ? trade.price.toFixed(2) : trade.price.toFixed(4)}
                    </span>
                    <span className="mono" style={{ color: 'var(--text-muted)' }}>
                      {trade.qty.toFixed(3)}
                    </span>
                    <span className="mono" style={{ fontWeight: 600, color: isBuy ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      ${trade.total_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      {trade.is_large ? (
                        <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 5px', borderRadius: '2px', backgroundColor: 'rgba(212, 175, 55, 0.2)', color: 'var(--gold-primary)' }}>
                          WHALE
                        </span>
                      ) : (
                        <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                          RETAIL
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Global Orderbook Depth (Bids vs Asks Queue) */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: '#090e1a',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} color="var(--cyan-neon)" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                GLOBAL ORDERBOOK LIQUIDITY DEPTH
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--gold-primary)' }}>
              {orderbookData?.exchange || 'VERIFIED POOL'}
            </span>
          </div>

          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
            {/* ASKS (Sellers Queue) */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-sell)', marginBottom: '6px', textTransform: 'uppercase' }}>
                ASK WALL (SELL ORDERS)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {(orderbookData?.asks || []).slice(0, 10).map((ask, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      padding: '3px 6px',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(255, 51, 102, 0.06)'
                    }}
                  >
                    <span className="mono" style={{ color: 'var(--color-sell)', fontWeight: 600 }}>
                      ${ask.price.toFixed(2)}
                    </span>
                    <span className="mono" style={{ color: 'var(--text-dim)' }}>
                      {ask.qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* BIDS (Buyers Queue) */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-buy)', marginBottom: '6px', textTransform: 'uppercase' }}>
                BID WALL (BUY ORDERS)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {(orderbookData?.bids || []).slice(0, 10).map((bid, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      padding: '3px 6px',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(0, 230, 118, 0.06)'
                    }}
                  >
                    <span className="mono" style={{ color: 'var(--color-buy)', fontWeight: 600 }}>
                      ${bid.price.toFixed(2)}
                    </span>
                    <span className="mono" style={{ color: 'var(--text-dim)' }}>
                      {bid.qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Trade launcher */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <button
              onClick={() => {
                if (onSelectSymbol) onSelectSymbol(selectedSymbol);
                if (onNavigateTab) onNavigateTab('crazii_chart');
              }}
              className="btn btn-gold"
              style={{ width: '100%', padding: '8px', fontSize: '11.5px' }}
            >
              Trade {selectedSymbol} in CRAZII Terminal &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

