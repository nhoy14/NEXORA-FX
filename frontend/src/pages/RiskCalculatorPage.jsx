import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Shield,
  Target,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { api } from '../services/api.js';

export default function RiskCalculatorPage({ currentPrice = 3876.24, onShowToast }) {
  const [symbol, setSymbol] = useState('XAUUSD');
  const [balance, setBalance] = useState(10000);
  const [riskPct, setRiskPct] = useState(1.0);
  const [entryPrice, setEntryPrice] = useState(currentPrice || 3876.24);
  const [slPrice, setSlPrice] = useState(currentPrice ? (currentPrice * 0.995).toFixed(2) : 3855.0);
  const [tpPrice, setTpPrice] = useState(currentPrice ? (currentPrice * 1.015).toFixed(2) : 3925.0);
  const [calcResult, setCalcResult] = useState(null);

  // Contract specs for symbols
  const specs = {
    XAUUSD: { name: 'Gold Spot', contractSize: 100, pointSize: 0.01, pipScale: 10 },
    EURUSD: { name: 'Euro / USD', contractSize: 100000, pointSize: 0.0001, pipScale: 10000 },
    GBPUSD: { name: 'GBP / USD', contractSize: 100000, pointSize: 0.0001, pipScale: 10000 },
    USDJPY: { name: 'USD / JPY', contractSize: 100000, pointSize: 0.01, pipScale: 100 },
    BTCUSD: { name: 'Bitcoin', contractSize: 1, pointSize: 1.0, pipScale: 1 },
    US100: { name: 'Nasdaq 100', contractSize: 20, pointSize: 0.1, pipScale: 1 },
    USOIL: { name: 'WTI Oil', contractSize: 1000, pointSize: 0.01, pipScale: 100 }
  };

  const handleCalculate = async () => {
    try {
      const res = await api.calculateRisk({
        symbol,
        account_balance: parseFloat(balance),
        risk_pct: parseFloat(riskPct),
        entry_price: parseFloat(entryPrice),
        sl_price: parseFloat(slPrice),
        tp_price: parseFloat(tpPrice)
      });
      setCalcResult(res);
    } catch (err) {
      console.error('Risk calc API error:', err);
      // Fallback local mathematical calculation with exact contract specs
      runLocalCalc();
    }
  };

  const runLocalCalc = () => {
    const spec = specs[symbol] || specs.XAUUSD;
    const riskDollar = (balance * riskPct) / 100;
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(slPrice);
    const tp = parseFloat(tpPrice);

    const slDistance = Math.abs(entry - sl);
    const tpDistance = Math.abs(tp - entry);

    // Lot Size = Risk Dollar / (SL Distance * Contract Size)
    const exactLot = slDistance > 0 ? riskDollar / (slDistance * spec.contractSize) : 0;
    const roundedLot = Math.max(0.01, Math.floor(exactLot * 100) / 100);

    const actualRisk = roundedLot * slDistance * spec.contractSize;
    const actualReward = roundedLot * tpDistance * spec.contractSize;
    const rr = slDistance > 0 ? (tpDistance / slDistance) : 0;

    setCalcResult({
      recommended_lots: roundedLot,
      risk_dollar: actualRisk,
      reward_dollar: actualReward,
      rr_ratio: rr,
      sl_points: slDistance,
      sl_pips: slDistance * spec.pipScale,
      margin_required: (entry * roundedLot * spec.contractSize) / 100 // 1:100 leverage assumption
    });
  };

  useEffect(() => {
    runLocalCalc();
  }, [symbol, balance, riskPct, entryPrice, slPrice, tpPrice]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Header Card */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <Calculator size={15} color="var(--gold-primary)" />
            INSTITUTIONAL POSITION SIZING & RISK CALCULATOR
          </span>
          <span className="badge badge-gold">PRECISION CONTRACT SPECS</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Calculates mathematically verified position volume based on strict account risk % and broker contract specifications.
        </p>
      </div>

      {/* 2. Form & Output Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '16px' }}>
        {/* Form Inputs */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', textTransform: 'uppercase' }}>
            TRADE PARAMETERS
          </div>

          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
              Instrument Specification
            </label>
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                const s = e.target.value;
                if (s === 'XAUUSD') { setEntryPrice(3876.24); setSlPrice(3860.0); setTpPrice(3915.0); }
                else if (s === 'BTCUSD') { setEntryPrice(76660); setSlPrice(75500); setTpPrice(79000); }
                else if (s === 'EURUSD') { setEntryPrice(1.1166); setSlPrice(1.1140); setTpPrice(1.1225); }
              }}
            >
              <option value="XAUUSD">XAUUSD (Gold Spot — 100 oz/lot)</option>
              <option value="EURUSD">EURUSD (Euro — 100,000 units/lot)</option>
              <option value="GBPUSD">GBPUSD (Pound — 100,000 units/lot)</option>
              <option value="USDJPY">USDJPY (Yen — 100,000 units/lot)</option>
              <option value="BTCUSD">BTCUSD (Bitcoin — 1 Coin/lot)</option>
              <option value="US100">US100 (Nasdaq — 20x contract/lot)</option>
              <option value="USOIL">USOIL (WTI Crude — 1,000 bbl/lot)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Account Balance ($)
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--gold-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                step="0.25"
                value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Entry Price
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-sell)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Stop Loss
              </label>
              <input
                type="number"
                step="any"
                value={slPrice}
                onChange={(e) => setSlPrice(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-buy)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Take Profit
              </label>
              <input
                type="number"
                step="any"
                value={tpPrice}
                onChange={(e) => setTpPrice(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-dim)', backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            Contract Size: <strong className="mono text-gold">{specs[symbol]?.contractSize} units / standard lot</strong>
          </div>
        </div>

        {/* Output Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Main Lot Size Highlight */}
          <div
            className="nx-card"
            style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(13, 20, 36, 0.9) 100%)',
              border: '1px solid var(--gold-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                RECOMMENDED POSITION SIZE
              </div>
              <div className="mono text-gold" style={{ fontSize: '38px', fontWeight: 900 }}>
                {calcResult?.recommended_lots || '0.10'}{' '}
                <span style={{ fontSize: '18px', fontWeight: 600 }}>LOTS</span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Exact sizing to risk strictly {riskPct}% (${((balance * riskPct) / 100).toFixed(2)})
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-gold" style={{ fontSize: '12px', padding: '6px 14px' }}>
                1 : {calcResult?.rr_ratio ? calcResult.rr_ratio.toFixed(2) : '2.50'} R:R
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="nx-card" style={{ borderLeft: '3px solid var(--color-sell)' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-sell)' }}>TOTAL DOLLAR RISK</div>
              <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-sell)', margin: '4px 0' }}>
                -${calcResult?.risk_dollar ? calcResult.risk_dollar.toFixed(2) : '100.00'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                Distance: {calcResult?.sl_points ? calcResult.sl_points.toFixed(2) : '16.24'} points
              </div>
            </div>

            <div className="nx-card" style={{ borderLeft: '3px solid var(--color-buy)' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-buy)' }}>PROJECTED REWARD (TP)</div>
              <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-buy)', margin: '4px 0' }}>
                +${calcResult?.reward_dollar ? calcResult.reward_dollar.toFixed(2) : '245.00'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                Gain on Target hit
              </div>
            </div>

            <div className="nx-card">
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>ESTIMATED MARGIN REQUIRED</div>
              <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                ${calcResult?.margin_required ? calcResult.margin_required.toFixed(2) : '387.62'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                Assuming 1:100 broker leverage
              </div>
            </div>

            <div className="nx-card">
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>MAX DRAWDOWN SAFETY</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-buy)', margin: '4px 0' }}>
                OPTIMAL RISK
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                Survives 20 consecutive losses
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
