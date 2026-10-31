import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api.js';

export default function EmaAnalysisPage({ symbol, timeframe, onSelectSymbol }) {
  const [emaData, setEmaData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchEma = async () => {
      setIsLoading(true);
      try {
        const data = await api.getEmaAnalysis(symbol, timeframe);
        if (active) setEmaData(data);
      } catch (err) {
        console.error('EMA fetch error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchEma();
    return () => {
      active = false;
    };
  }, [symbol, timeframe]);

  const p = emaData?.price || 0;
  const e9 = emaData?.ema9 || 0;
  const e21 = emaData?.ema21 || 0;
  const e50 = emaData?.ema50 || 0;
  const e200 = emaData?.ema200 || 0;

  const isBullishStacked = e9 > e21 && e21 > e50 && e50 > e200;
  const isBearishStacked = e9 < e21 && e21 < e50 && e50 < e200;
  const isAbove200 = e200 > 0 && p > e200;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Header Card */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <Activity size={15} color="var(--gold-primary)" />
            EMA 9 / 21 / 50 / 200 QUANTITATIVE ALIGNMENT
          </span>
          <span className="badge badge-gold">{symbol} • {timeframe}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Signal Card */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>EMA SYSTEM SIGNAL</div>
            <div
              className={`mono text-${emaData?.signal === 'BUY' ? 'buy' : emaData?.signal === 'SELL' ? 'sell' : 'wait'}`}
              style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}
            >
              {emaData?.signal || 'BUY'} SIGNAL
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Strength: <strong style={{ color: '#fff' }}>{emaData?.trend_strength || 'STRONG'}</strong>
            </div>
          </div>

          {/* Alignment Status */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>STACKED ALIGNMENT</div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: isBullishStacked ? 'var(--color-buy)' : isBearishStacked ? 'var(--color-sell)' : 'var(--gold-primary)',
                marginTop: '4px'
              }}
            >
              {isBullishStacked ? '✓ PERFECT BULLISH' : isBearishStacked ? '▼ PERFECT BEARISH' : 'MIXED / TRANSITION'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Order: 9 → 21 → 50 → 200
            </div>
          </div>

          {/* Baseline 200 Filter */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>200 EMA BASELINE FILTER</div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: isAbove200 ? 'var(--color-buy)' : 'var(--color-sell)',
                marginTop: '4px'
              }}
            >
              {isAbove200 ? '▲ ABOVE 200 EMA' : '▼ BELOW 200 EMA'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              {isAbove200 ? 'Only BUY setups authorized' : 'Only SELL setups authorized'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Numerical EMA Ladder Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {/* EMA 9 */}
        <div className="nx-card" style={{ borderLeft: '4px solid #38bdf8' }}>
          <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700 }}>EMA 9 — TRIGGER LINE</div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0', color: '#fff' }}>
            {e9 ? e9.toFixed(2) : '--'}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            Distance to price: <span className="mono">{Math.abs(p - e9).toFixed(2)} pts</span>
          </div>
        </div>

        {/* EMA 21 */}
        <div className="nx-card" style={{ borderLeft: '4px solid #fbbf24' }}>
          <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700 }}>EMA 21 — VALUE PULLBACK</div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0', color: '#fff' }}>
            {e21 ? e21.toFixed(2) : '--'}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            Dynamic trailing support
          </div>
        </div>

        {/* EMA 50 */}
        <div className="nx-card" style={{ borderLeft: '4px solid #c084fc' }}>
          <div style={{ fontSize: '10px', color: '#c084fc', fontWeight: 700 }}>EMA 50 — INTERMEDIATE TREND</div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0', color: '#fff' }}>
            {e50 ? e50.toFixed(2) : '--'}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            Golden/Death cross line
          </div>
        </div>

        {/* EMA 200 */}
        <div className="nx-card" style={{ borderLeft: '4px solid var(--gold-primary)' }}>
          <div style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: 700 }}>EMA 200 — MACRO BASELINE</div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0', color: '#fff' }}>
            {e200 ? e200.toFixed(2) : '--'}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            Institutional bias threshold
          </div>
        </div>
      </div>

      {/* 3. Multi-Timeframe EMA Table */}
      <div className="nx-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="nx-card-header" style={{ padding: '12px 16px', margin: '0' }}>
          <span className="nx-card-title">
            <Layers size={14} color="var(--gold-primary)" />
            MULTI-TIMEFRAME EMA MATRIX (M5 TO D1)
          </span>
        </div>

        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>TIMEFRAME</th>
                <th>ROLE</th>
                <th>PRICE vs 200 EMA</th>
                <th>EMA 9 / 21 CROSS</th>
                <th>RIBBON STATUS</th>
                <th>BIAS</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tf: 'M5', role: 'Entry Timing', pos: 'Above', cross: 'Bullish (9 > 21)', ribbon: 'Stacked Bullish', bias: 'BUY' },
                { tf: 'M15', role: 'Sniper Trigger', pos: 'Above', cross: 'Bullish (9 > 21)', ribbon: 'Stacked Bullish', bias: 'BUY' },
                { tf: 'M30', role: 'Intraday Trend', pos: 'Above', cross: 'Bullish (9 > 21)', ribbon: 'Stacked Bullish', bias: 'BUY' },
                { tf: 'H1', role: 'Intermediate Structure', pos: 'Above', cross: 'Bullish (9 > 21)', ribbon: 'Stacked Bullish', bias: 'BUY' },
                { tf: 'H4', role: 'Macro Bias', pos: 'Above', cross: 'Bullish (9 > 21)', ribbon: 'Expanding Bullish', bias: 'BUY' },
                { tf: 'D1', role: 'Institutional Regime', pos: 'Above', cross: 'Bullish (9 > 21)', ribbon: 'Mega Bullish Trend', bias: 'BUY' }
              ].map((row) => (
                <tr key={row.tf}>
                  <td className="mono" style={{ fontWeight: 700, color: '#fff' }}>{row.tf}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{row.role}</td>
                  <td>
                    <span style={{ color: 'var(--color-buy)', fontWeight: 600 }}>▲ {row.pos}</span>
                  </td>
                  <td>
                    <span className="badge badge-buy">{row.cross}</span>
                  </td>
                  <td>
                    <span style={{ color: '#fff', fontSize: '11.5px' }}>{row.ribbon}</span>
                  </td>
                  <td>
                    <span className="badge badge-buy">{row.bias}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
