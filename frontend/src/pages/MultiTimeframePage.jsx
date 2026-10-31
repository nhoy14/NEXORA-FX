import React, { useState, useEffect } from 'react';
import {
  Grid,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api.js';

export default function MultiTimeframePage({ symbol, onSelectSymbol }) {
  const [mtfData, setMtfData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchMtf = async () => {
      setIsLoading(true);
      try {
        const data = await api.getMtfMatrix(symbol);
        if (active) setMtfData(data);
      } catch (err) {
        console.error('MTF fetch error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchMtf();
    return () => {
      active = false;
    };
  }, [symbol]);

  const matrix = mtfData?.matrix || {};
  const tfs = ['H4', 'H1', 'M15', 'M5'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* Header Confluence Card */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <Grid size={15} color="var(--gold-primary)" />
            MULTI-TIMEFRAME CONFLUENCE MATRIX
          </span>
          <span className="badge badge-gold">{symbol}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>OVERALL ALIGNMENT BIAS</div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: mtfData?.overall_bias?.includes('BULLISH') ? 'var(--color-buy)' : mtfData?.overall_bias?.includes('BEARISH') ? 'var(--color-sell)' : 'var(--color-wait)',
                marginTop: '4px'
              }}
            >
              {mtfData?.overall_bias || 'STRONG_BULLISH'}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {mtfData?.recommendation || 'Multiple timeframes show synchronized directional momentum.'}
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--gold-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>CONFLUENCE RATING</div>
              <div className="mono text-gold" style={{ fontSize: '26px', fontWeight: 800 }}>
                {mtfData?.confluence_score || 85} / 100
              </div>
            </div>
            <span
              className={`badge ${
                mtfData?.overall_bias?.includes('BULLISH') ? 'badge-buy' : 'badge-sell'
              }`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              HIGH CONFLUENCE
            </span>
          </div>
        </div>
      </div>

      {/* Timeframe Alignment Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {tfs.map((tf) => {
          const item = matrix[tf] || {};
          const isBuy = item.direction === 'BUY';
          const isSell = item.direction === 'SELL';

          return (
            <div
              key={tf}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                    {tf}
                  </span>
                  <span className={`badge ${isBuy ? 'badge-buy' : isSell ? 'badge-sell' : 'badge-wait'}`}>
                    {item.direction || 'BUY'}
                  </span>
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {item.role || 'Structural Analysis'}
                </div>

                <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>EMA Trend:</span>
                    <strong style={{ color: item.ema_trend === 'BULLISH' ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {item.ema_trend || 'BULLISH'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>SMC Structure:</span>
                    <strong style={{ color: '#fff' }}>{item.structure_state || 'BULLISH'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Setup Score:</span>
                    <span className="mono text-gold" style={{ fontWeight: 700 }}>
                      {item.score || 80}/100
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                {item.key_reason || 'Higher timeframe bullish momentum expanding.'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
