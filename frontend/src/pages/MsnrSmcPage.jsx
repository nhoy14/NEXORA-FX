import React, { useState, useEffect } from 'react';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api.js';

export default function MsnrSmcPage({ symbol, timeframe }) {
  const [smcData, setSmcData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchSmc = async () => {
      setIsLoading(true);
      try {
        const data = await api.getMsnrAnalysis(symbol, timeframe);
        if (active) setSmcData(data);
      } catch (err) {
        console.error('MSNR/SMC fetch error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchSmc();
    return () => {
      active = false;
    };
  }, [symbol, timeframe]);

  const eq = smcData?.equilibrium || {};
  const isDiscount = eq.zone === 'DISCOUNT';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Header Overview Card */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <Layers size={15} color="var(--gold-primary)" />
            MSNR & SMART MONEY CONCEPTS (SMC) ENGINE
          </span>
          <span className="badge badge-gold">{symbol} • {timeframe}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Structural Regime */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>STRUCTURE REGIME</div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: smcData?.structure_state === 'BULLISH' ? 'var(--color-buy)' : 'var(--color-sell)',
                marginTop: '4px'
              }}
            >
              {smcData?.structure_state || 'BULLISH'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Chronological BOS & CHoCH verified
            </div>
          </div>

          {/* 50% Dealing Range Equilibrium */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>50% EQUILIBRIUM ZONE</div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: isDiscount ? 'var(--color-buy)' : 'var(--color-sell)',
                marginTop: '4px'
              }}
            >
              {isDiscount ? '▲ DISCOUNT (BUY ZONE)' : '▼ PREMIUM (SELL ZONE)'}
            </div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Midpoint: {eq.midpoint_50 ? eq.midpoint_50.toFixed(2) : '--'}
            </div>
          </div>

          {/* SBR / RBS Flips */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>SBR / RBS FLIP STATUS</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
              {smcData?.sbr_levels?.length > 0 ? '⚠ SBR ACTIVE (Resistance)' : smcData?.rbs_levels?.length > 0 ? '✓ RBS ACTIVE (Support)' : 'Levels In Play'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Support-Becomes-Resistance / Retests
            </div>
          </div>
        </div>
      </div>

      {/* 2. MSNR Setups: Classic A & Classic V */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
        {/* Classic A (Apex Rejection / Resistance) */}
        <div className="nx-card">
          <div className="nx-card-header">
            <span className="nx-card-title" style={{ color: 'var(--color-sell)' }}>
              <ArrowDownCircle size={15} color="var(--color-sell)" />
              CLASSIC A FORMATIONS (APEX RESISTANCE)
            </span>
            <span className="badge badge-sell">{smcData?.classic_a?.length || 0} DETECTED</span>
          </div>

          {smcData?.classic_a && smcData.classic_a.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {smcData.classic_a.slice(0, 3).map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--color-sell)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      Apex Level: {a.apex_price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>{a.label}</div>
                  </div>
                  <span className="badge badge-sell">RESISTANCE</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '12px 0' }}>
              No recent Classic A peak rejections in active lookback.
            </div>
          )}
        </div>

        {/* Classic V (Valley Bounce / Support) */}
        <div className="nx-card">
          <div className="nx-card-header">
            <span className="nx-card-title" style={{ color: 'var(--color-buy)' }}>
              <ArrowUpCircle size={15} color="var(--color-buy)" />
              CLASSIC V FORMATIONS (VALLEY SUPPORT)
            </span>
            <span className="badge badge-buy">{smcData?.classic_v?.length || 0} DETECTED</span>
          </div>

          {smcData?.classic_v && smcData.classic_v.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {smcData.classic_v.slice(0, 3).map((v, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--color-buy)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      Valley Level: {v.valley_price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>{v.label}</div>
                  </div>
                  <span className="badge badge-buy">SUPPORT</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '12px 0' }}>
              No recent Classic V valley bounces in active lookback.
            </div>
          )}
        </div>
      </div>

      {/* 3. Order Blocks & Fair Value Gaps (FVG) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
        {/* Order Blocks */}
        <div className="nx-card">
          <div className="nx-card-header">
            <span className="nx-card-title">
              <Target size={15} color="var(--gold-primary)" />
              INSTITUTIONAL ORDER BLOCKS (OB)
            </span>
            <span className="badge badge-cyan">{smcData?.order_blocks?.length || 0} ACTIVE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(smcData?.order_blocks || []).slice(0, 4).map((ob, idx) => {
              const isBull = ob.type === 'BULLISH_OB';
              return (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span className={`badge ${isBull ? 'badge-buy' : 'badge-sell'}`} style={{ fontSize: '9.5px' }}>
                      {ob.type}
                    </span>
                    <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginLeft: '8px' }}>
                      {ob.bottom.toFixed(2)} — {ob.top.toFixed(2)}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: ob.mitigated ? 'var(--text-dim)' : 'var(--gold-primary)' }}>
                    {ob.mitigated ? 'Mitigated' : '★ Unmitigated Zone'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fair Value Gaps (FVG) */}
        <div className="nx-card">
          <div className="nx-card-header">
            <span className="nx-card-title">
              <Sparkles size={15} color="var(--cyan-neon)" />
              FAIR VALUE GAPS (FVG IMBALANCES)
            </span>
            <span className="badge badge-cyan">{smcData?.fair_value_gaps?.length || 0} ACTIVE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(smcData?.fair_value_gaps || []).slice(0, 4).map((fvg, idx) => {
              const isBull = fvg.type === 'BULLISH_FVG';
              return (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span className={`badge ${isBull ? 'badge-buy' : 'badge-sell'}`} style={{ fontSize: '9.5px' }}>
                      {fvg.type}
                    </span>
                    <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginLeft: '8px' }}>
                      {fvg.bottom.toFixed(2)} — {fvg.top.toFixed(2)}
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                    Size: {fvg.size.toFixed(2)} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Liquidity Pools (BSL & SSL) */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <ShieldAlert size={15} color="var(--gold-primary)" />
            BUY-SIDE (BSL) & SELL-SIDE (SSL) LIQUIDITY POOLS
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Resting Stops & Equal Levels</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          {/* BSL */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-sell)', marginBottom: '8px' }}>
              BUY-SIDE LIQUIDITY (RESTING BUY STOPS ABOVE HIGHS)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(smcData?.bsl_levels || []).map((b, i) => (
                <div key={i} style={{ padding: '6px 10px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{b.price.toFixed(2)}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Target for Liquidity Sweep</span>
                </div>
              ))}
            </div>
          </div>

          {/* SSL */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-buy)', marginBottom: '8px' }}>
              SELL-SIDE LIQUIDITY (RESTING SELL STOPS BELOW LOWS)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(smcData?.ssl_levels || []).map((s, i) => (
                <div key={i} style={{ padding: '6px 10px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{s.price.toFixed(2)}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Target for Liquidity Sweep</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
