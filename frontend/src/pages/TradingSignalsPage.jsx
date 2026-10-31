import React, { useState } from 'react';
import {
  Radio,
  Target,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function TradingSignalsPage({ onSelectSymbol, onNavigateTab }) {
  const [filter, setFilter] = useState('ALL');

  const liveSignals = [
    {
      symbol: 'XAUUSD',
      name: 'Gold Spot / US Dollar',
      direction: 'BUY',
      timeframe: 'M15',
      entry: 3876.24,
      sl: 3862.50,
      tp1: 3905.00,
      tp2: 3925.00,
      tp3: 3950.00,
      rr: 2.1,
      confidence: 85,
      timestamp: '2 mins ago',
      dataStatus: 'VERIFIED MT5 IPC 0ms',
      reasons: [
        'Price broke above 200 EMA baseline with strong volume expansion',
        'Bullish CHoCH structure shift confirmed on M15',
        'CRAZII OP: Trading above Opening Price line with KSI flow at 78%'
      ]
    },
    {
      symbol: 'BTCUSD',
      name: 'Bitcoin / US Dollar',
      direction: 'SELL',
      timeframe: 'H1',
      entry: 76663.21,
      sl: 77517.72,
      tp1: 75200.00,
      tp2: 74100.00,
      tp3: 72800.00,
      rr: 2.8,
      confidence: 80,
      timestamp: '5 mins ago',
      dataStatus: 'REAL-TIME 24/7 BINANCE',
      reasons: [
        'Clean rejection from Bearish Order Block at 77,500',
        'KCX Retail Trap alert triggered on H1 expansion',
        'RSI (14) printed bearish divergence at 78.4'
      ]
    },
    {
      symbol: 'EURUSD',
      name: 'Euro / US Dollar',
      direction: 'BUY',
      timeframe: 'M15',
      entry: 1.1166,
      sl: 1.1142,
      tp1: 1.1215,
      tp2: 1.1245,
      tp3: 1.1280,
      rr: 2.0,
      confidence: 76,
      timestamp: '8 mins ago',
      dataStatus: 'DIRECT MT5 FEED',
      reasons: [
        'Pullback into M15 Discount Zone below 50% equilibrium',
        'EMA 9 crossing above EMA 21 on London open momentum',
        'Equal Lows (EQL) liquidity sweep completed'
      ]
    },
    {
      symbol: 'US100',
      name: 'Nasdaq 100 Index',
      direction: 'BUY',
      timeframe: 'H1',
      entry: 28293.69,
      sl: 28140.00,
      tp1: 28550.00,
      tp2: 28720.00,
      tp3: 28900.00,
      rr: 2.3,
      confidence: 82,
      timestamp: '12 mins ago',
      dataStatus: 'VERIFIED EXCHANGE FEED',
      reasons: [
        'Tech earnings momentum expansion above key resistance',
        'Bullish FVG retested and respected on H1',
        'Multi-timeframe matrix 4/4 aligned bullish'
      ]
    },
    {
      symbol: 'NVDA',
      name: 'Nvidia Corp.',
      direction: 'BUY',
      timeframe: 'H1',
      entry: 282.76,
      sl: 276.50,
      tp1: 294.00,
      tp2: 302.00,
      tp3: 312.00,
      rr: 2.4,
      confidence: 78,
      timestamp: '15 mins ago',
      dataStatus: 'PUBLIC DIRECT FEED',
      reasons: [
        'Institutional accumulation Order Block defended at 278',
        'EMA 50 structural support test held with high volume',
        'Semiconductor sector strength alignment'
      ]
    },
    {
      symbol: 'USOIL',
      name: 'Crude Oil (WTI)',
      direction: 'WAIT',
      timeframe: 'H1',
      entry: 71.45,
      sl: 71.45,
      tp1: 71.45,
      tp2: 71.45,
      tp3: 71.45,
      rr: 1.0,
      confidence: 45,
      timestamp: '18 mins ago',
      dataStatus: 'MT5 COMMODITIES',
      reasons: [
        'Chop zone: Trading directly inside 50% equilibrium midpoint',
        'Timeframe conflict: M15 Bearish vs H4 Bullish',
        'Waiting for breakout of range 70.80 - 72.30'
      ]
    }
  ];

  const filteredSignals = liveSignals.filter((s) => {
    if (filter === 'ALL') return true;
    return s.direction === filter;
  });

  const handleExecute = (s) => {
    onSelectSymbol(s.symbol);
    onNavigateTab('crazii_chart');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* Header Deck */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <Radio size={15} color="var(--gold-primary)" />
            INSTITUTIONAL QUANTITATIVE SIGNALS
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Zero-Lookahead Algorithmic Setups
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Filter Buttons */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
            {['ALL', 'BUY', 'SELL', 'WAIT'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filter === f ? 'var(--gold-primary)' : 'transparent',
                  color: filter === f ? '#070a12' : 'var(--text-muted)'
                }}
              >
                {f} Signals
              </button>
            ))}
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
            Showing <strong className="text-gold">{filteredSignals.length}</strong> active validated setups
          </div>
        </div>
      </div>

      {/* Signal Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
        {filteredSignals.map((s) => {
          const isBuy = s.direction === 'BUY';
          const isSell = s.direction === 'SELL';

          return (
            <div
              key={s.symbol}
              className="nx-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                borderLeft: `4px solid ${isBuy ? 'var(--color-buy)' : isSell ? 'var(--color-sell)' : 'var(--color-wait)'}`
              }}
            >
              <div>
                {/* Header: Symbol & Signal Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                      {s.symbol} <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>({s.timeframe})</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{s.name}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${isBuy ? 'badge-buy' : isSell ? 'badge-sell' : 'badge-wait'}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
                      {s.direction} SIGNAL
                    </span>
                    <div className="mono text-gold" style={{ fontSize: '11px', fontWeight: 700, marginTop: '3px' }}>
                      Score: {s.confidence}/100
                    </div>
                  </div>
                </div>

                {/* Numerical Execution Targets */}
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    margin: '14px 0'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>ENTRY ZONE</div>
                    <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                      {s.entry ? s.entry.toFixed(2) : '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: 'var(--color-sell)' }}>STOP LOSS</div>
                    <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-sell)' }}>
                      {s.sl ? s.sl.toFixed(2) : '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: 'var(--color-buy)' }}>TARGET TP1</div>
                    <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-buy)' }}>
                      {s.tp1 ? s.tp1.toFixed(2) : '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: 'var(--gold-primary)' }}>R:R RATIO</div>
                    <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold-primary)' }}>
                      1 : {s.rr}
                    </div>
                  </div>
                </div>

                {/* TP2 & TP3 targets */}
                <div style={{ display: 'flex', gap: '12px', fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                  <span>TP2: <strong className="mono" style={{ color: 'var(--color-buy)' }}>{s.tp2.toFixed(2)}</strong></span>
                  <span>TP3: <strong className="mono" style={{ color: 'var(--color-buy)' }}>{s.tp3.toFixed(2)}</strong></span>
                </div>

                {/* Detailed Reasons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Documented Rule Confluences:
                  </div>
                  {s.reasons.map((r, i) => (
                    <div key={i} style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={11} color="var(--gold-primary)" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer: Data Quality & Execute Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '10.5px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={13} color="var(--color-buy)" />
                  <span style={{ color: 'var(--text-dim)' }}>{s.dataStatus}</span>
                </div>

                <button
                  onClick={() => handleExecute(s)}
                  className="btn btn-gold"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  Execute in Terminal <ChevronRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
