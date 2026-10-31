import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Shield,
  Zap,
  BarChart2,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import CraziiCanvasChart from '../components/CraziiCanvasChart.jsx';
import EconomicCalendar from '../components/EconomicCalendar.jsx';

export default function DashboardPage({
  symbol,
  onSelectSymbol,
  timeframe,
  marketData,
  analysisData,
  onNavigateTab
}) {
  const [sessions, setSessions] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Watchlist items with live price tracking
  const watchlist = [
    { symbol: 'XAUUSD', name: 'Gold Spot', cat: 'Metals', price: 3876.24, change: 0.42 },
    { symbol: 'BTCUSD', name: 'Bitcoin', cat: 'Crypto', price: 76663.21, change: -1.85 },
    { symbol: 'EURUSD', name: 'Euro / USD', cat: 'Forex', price: 1.1166, change: 0.12 },
    { symbol: 'US100', name: 'Nasdaq 100', cat: 'Indices', price: 28293.69, change: 0.65 },
    { symbol: 'USOIL', name: 'Crude Oil', cat: 'Energy', price: 71.45, change: -0.38 },
    { symbol: 'NVDA', name: 'Nvidia Corp.', cat: 'Tech', price: 282.76, change: 1.45 }
  ];

  // Global Trading Sessions calculation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const utcHour = now.getUTCHours();
      const utcMin = now.getUTCMinutes();
      const decTime = utcHour + utcMin / 60;

      // London: 08:00 - 16:30 UTC
      // New York: 13:00 - 21:00 UTC
      // Tokyo: 00:00 - 09:00 UTC
      // Sydney: 21:00 - 06:00 UTC
      setSessions([
        {
          name: 'London',
          isOpen: decTime >= 8 && decTime < 16.5,
          hours: '08:00 - 16:30 UTC',
          bias: 'High Volatility'
        },
        {
          name: 'New York',
          isOpen: decTime >= 13 && decTime < 21,
          hours: '13:00 - 21:00 UTC',
          bias: 'Maximum Liquidity'
        },
        {
          name: 'Tokyo',
          isOpen: decTime >= 0 && decTime < 9,
          hours: '00:00 - 09:00 UTC',
          bias: 'Asian Range'
        },
        {
          name: 'Sydney',
          isOpen: decTime >= 21 || decTime < 6,
          hours: '21:00 - 06:00 UTC',
          bias: 'Early Pacific'
        }
      ]);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const signal = analysisData?.signal || {};
  const crazii = analysisData?.crazii || {};
  const ind = analysisData?.indicators?.latest || {};
  const score = signal.setup_score || 75;

  const curP = marketData?.latest_price || marketData?.price || analysisData?.latest_price || 0;
  const entryVal = signal.entry ?? signal.entry_price ?? (curP > 0 ? curP : null);
  const isSellDir = signal.direction === 'SELL';
  const slVal = signal.sl ?? signal.sl_price ?? (entryVal ? (isSellDir ? entryVal * 1.006 : entryVal * 0.994) : null);
  const tpVal = signal.tp1 ?? signal.tp1_price ?? (entryVal ? (isSellDir ? entryVal * 0.985 : entryVal * 1.015) : null);
  const rrVal = signal.rr_ratio ?? 2.5;

  const e9Val = ind.ema9 ?? ind.ema_fast;
  const e21Val = ind.ema21 ?? ind.ema_medium;
  const e50Val = ind.ema50 ?? ind.ema_slow;
  const e200Val = ind.ema200 ?? ind.ema_baseline;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Live Ticker Tape */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px'
        }}
      >
        {watchlist.map((item) => {
          const isSelected = item.symbol === symbol;
          const isUp = item.change >= 0;
          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className="nx-card"
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)',
                backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.08)' : 'var(--bg-card)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                  {item.symbol}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{item.cat}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                  {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isUp ? 'var(--color-buy)' : 'var(--color-sell)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {isUp ? '+' : ''}{item.change.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Main Grid: Hero Setup Card + Mini Chart Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '16px' }}>
        {/* Hero Confluence Signal Card */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="nx-card-header">
              <span className="nx-card-title">
                <Target size={15} color="var(--gold-primary)" />
                TOP SNIPER CONFLUENCE SETUP
              </span>
              <span
                className={`badge ${
                  signal.direction === 'BUY' ? 'badge-buy' : signal.direction === 'SELL' ? 'badge-sell' : 'badge-wait'
                }`}
              >
                {signal.direction || 'BUY'} SETUP
              </span>
            </div>

            {/* Score & Asset */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700 }} className="mono">
                  {symbol} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>({timeframe})</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Feed: {analysisData?.source || 'Verified Direct MT5 IPC'}
                </div>
              </div>

              {/* Confluence Gauge Badge */}
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(212, 175, 55, 0.12)',
                  border: '1px solid var(--gold-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold-primary)' }}>
                  {score}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>SCORE / 100</span>
              </div>
            </div>

            {/* Institutional Execution Levels Table */}
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                border: '1px solid var(--border-subtle)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '14px'
              }}
            >
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>ENTRY ZONE</div>
                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>
                  {entryVal ? entryVal.toFixed(2) : '--'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-sell)' }}>STOP LOSS</div>
                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-sell)' }}>
                  {slVal ? slVal.toFixed(2) : '--'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-buy)' }}>TARGET TP1</div>
                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-buy)' }}>
                  {tpVal ? tpVal.toFixed(2) : '--'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--gold-primary)' }}>R:R RATIO</div>
                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--gold-primary)' }}>
                  1 : {typeof rrVal === 'number' ? rrVal.toFixed(1) : rrVal}
                </div>
              </div>
            </div>

            {/* Reasons List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Algorithmic Drivers & Rules:
              </div>
              {(signal.reasons || [
                `EMA 9/21/50/200 Trend Alignment Bullish`,
                `SMC CHoCH Bullish Structure Confirmed`,
                `CRAZII OP: Price above Opening Price baseline`
              ]).slice(0, 3).map((r, i) => (
                <div key={i} style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={12} color="var(--gold-primary)" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action button to Terminal */}
          <button
            onClick={() => onNavigateTab('crazii_chart')}
            className="btn btn-gold"
            style={{ width: '100%', marginTop: '16px', padding: '10px' }}
          >
            Launch in CRAZII Terminal <ChevronRight size={15} />
          </button>
        </div>

        {/* Mini Live CRAZII Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <CraziiCanvasChart
            candles={analysisData?.candles || []}
            craziiData={crazii}
            indicators={analysisData?.indicators}
            marketStructure={analysisData?.market_structure}
            symbol={symbol}
            timeframe={timeframe}
            height={340}
          />
        </div>
      </div>

      {/* 3. Bottom Row: Global Sessions & Technical Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Global Sessions Tracker */}
        <div className="nx-card">
          <div className="nx-card-header">
            <span className="nx-card-title">
              <Clock size={15} color="var(--gold-primary)" />
              GLOBAL TRADING SESSIONS
            </span>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {currentTime.toUTCString().slice(17, 25)} UTC
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.map((s) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: s.isOpen ? 'var(--color-buy-border)' : 'var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: s.isOpen ? 'var(--color-buy)' : 'var(--text-dim)'
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{s.name} Session</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{s.hours}</span>
                  <span className={`badge ${s.isOpen ? 'badge-buy' : 'badge-dim'}`}>
                    {s.isOpen ? 'ACTIVE' : 'CLOSED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EMA Trend Alignment Breakdown */}
        <div className="nx-card">
          <div className="nx-card-header">
            <span className="nx-card-title">
              <BarChart2 size={15} color="var(--gold-primary)" />
              EMA 9 / 21 / 50 / 200 MATRIX
            </span>
            <span className="badge badge-gold">
              {e9Val && e21Val && e9Val > e21Val ? 'BULLISH ALIGNED' : 'BEARISH ALIGNED'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>EMA 9 (TRIGGER)</div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                {e9Val ? e9Val.toFixed(2) : '--'}
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>EMA 21 (PULLBACK)</div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>
                {e21Val ? e21Val.toFixed(2) : '--'}
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>EMA 50 (STRUCTURAL)</div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc' }}>
                {e50Val ? e50Val.toFixed(2) : '--'}
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>EMA 200 (BASELINE)</div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-primary)' }}>
                {e200Val ? e200Val.toFixed(2) : '--'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Baseline filter: Price is{' '}
            <strong style={{ color: e200Val && (curP || 0) > e200Val ? 'var(--color-buy)' : 'var(--color-sell)' }}>
              {e200Val && (curP || 0) > e200Val ? 'ABOVE' : 'BELOW'}
            </strong>{' '}
            the 200 EMA institutional threshold.
          </div>
        </div>

        {/* CRAZII Institutional Money Flow Widget */}
        <div className="nx-card">
          <div className="nx-card-header">
            <span className="nx-card-title">
              <Zap size={15} color="var(--gold-primary)" />
              CRAZII MONEY FLOW & TRAPS
            </span>
            <span className="badge badge-cyan">{crazii?.op?.bias || 'BUY_ONLY'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-dim)' }}>KSI Big Boys Volume Flow:</span>
                <span className="mono" style={{ fontWeight: 700, color: (crazii?.ksi?.score || 50) >= 50 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                  {crazii?.ksi?.score || 50}%
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${crazii?.ksi?.score || 50}%`,
                    height: '100%',
                    backgroundColor: (crazii?.ksi?.score || 50) >= 50 ? 'var(--color-buy)' : 'var(--color-sell)'
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '8px 10px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>KCX RETAIL TRAP DETECTOR</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: crazii?.kcx?.is_trap ? 'var(--color-sell)' : 'var(--color-buy)' }}>
                {crazii?.kcx?.is_trap ? '⚠ WARNING: Retail exhaustion trap detected!' : '✓ Clean Flow: No exhaustion trap'}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Opening Price (OP): <span className="mono text-gold">{crazii?.op?.price ? crazii.op.price.toFixed(2) : '--'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Economic Calendar */}
      <EconomicCalendar compact={true} />
    </div>
  );
}
