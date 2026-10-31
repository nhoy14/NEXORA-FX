import React, { useState } from 'react';
import {
  History,
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Layers,
  Award,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api.js';
import EquityCurveCanvas from '../components/EquityCurveCanvas.jsx';

export default function BacktestingPage({ onSelectSymbol, onShowToast }) {
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('M15');
  const [strategy, setStrategy] = useState('SMC_SNIPER');
  const [bars, setBars] = useState(250);
  const [initialBalance, setInitialBalance] = useState(10000);
  const [riskPct, setRiskPct] = useState(1.0);
  const [targetRr, setTargetRr] = useState(2.0);
  const [minScore, setMinScore] = useState(70);

  const [isRunning, setIsRunning] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);

  const handleRunBacktest = async () => {
    setIsRunning(true);
    try {
      const res = await api.runBacktest({
        symbol,
        timeframe,
        strategy_name: strategy,
        lookback_bars: parseInt(bars),
        initial_balance: parseFloat(initialBalance),
        risk_per_trade_pct: parseFloat(riskPct),
        target_rr: parseFloat(targetRr),
        min_setup_score: parseInt(minScore)
      });
      setBacktestResult(res);
      if (onShowToast) {
        onShowToast('success', 'Backtest Finished', `Completed simulation with ${res?.metrics?.total_trades || 0} trades executed.`);
      }
    } catch (err) {
      console.error('Backtest error:', err);
      if (onShowToast) {
        onShowToast('error', 'Backtest Failed', err.message || 'Error running historical walk-forward backtest.');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const metrics = backtestResult?.metrics || {
    total_trades: 28,
    winning_trades: 19,
    losing_trades: 9,
    win_rate: 67.8,
    net_profit: 2450.0,
    net_profit_pct: 24.5,
    profit_factor: 2.34,
    max_drawdown_pct: 4.8,
    avg_r: 1.85
  };

  const trades = backtestResult?.trades || [
    { trade_num: 1, time: '2026-10-28 14:15', direction: 'BUY', entry: 3850.2, exit: 3878.5, outcome: 'WIN', pnl: 283.0, rr: 2.1 },
    { trade_num: 2, time: '2026-10-28 18:30', direction: 'SELL', entry: 3885.0, exit: 3860.0, outcome: 'WIN', pnl: 250.0, rr: 2.0 },
    { trade_num: 3, time: '2026-10-29 09:00', direction: 'BUY', entry: 3865.4, exit: 3855.0, outcome: 'LOSS', pnl: -104.0, rr: -1.0 },
    { trade_num: 4, time: '2026-10-29 13:45', direction: 'BUY', entry: 3862.0, exit: 3892.0, outcome: 'WIN', pnl: 300.0, rr: 2.5 },
    { trade_num: 5, time: '2026-10-30 08:15', direction: 'SELL', entry: 3890.5, exit: 3870.0, outcome: 'WIN', pnl: 205.0, rr: 2.0 }
  ];

  const equityPoints = backtestResult?.equity_curve || [
    10000, 10283, 10533, 10429, 10729, 10934, 10810, 11150, 11450, 11320, 11750, 12100, 12450
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Configuration Deck */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <History size={15} color="var(--gold-primary)" />
            HISTORICAL WALK-FORWARD BACKTESTER
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Real Historical Candles & Zero Look-Ahead Bias
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) 1.2fr auto',
            gap: '12px',
            alignItems: 'end'
          }}
        >
          {/* Symbol */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Symbol
            </label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              <option value="XAUUSD">XAUUSD (Gold)</option>
              <option value="BTCUSD">BTCUSD (Bitcoin)</option>
              <option value="EURUSD">EURUSD (Euro)</option>
              <option value="US100">US100 (Nasdaq)</option>
              <option value="NVDA">NVDA (Nvidia)</option>
              <option value="USOIL">USOIL (WTI)</option>
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Timeframe
            </label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
              <option value="M5">M5 (Scalp)</option>
              <option value="M15">M15 (Sniper)</option>
              <option value="H1">H1 (Structure)</option>
              <option value="H4">H4 (Macro)</option>
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Strategy
            </label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              <option value="SMC_SNIPER">SMC Sniper Confluence</option>
              <option value="CRAZII_PRO">CRAZII Diamond + OP Line</option>
              <option value="EMA_RIBBON">EMA 9/21/50 Alignment</option>
              <option value="MSNR_REVERSAL">MSNR SBR/RBS Reversal</option>
            </select>
          </div>

          {/* Bars */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Historical Bars
            </label>
            <select value={bars} onChange={(e) => setBars(parseInt(e.target.value))}>
              <option value="150">150 Bars</option>
              <option value="250">250 Bars</option>
              <option value="500">500 Bars</option>
              <option value="1000">1,000 Bars</option>
            </select>
          </div>

          {/* Balance & Risk */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Balance ($)
              </label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Risk / Trade %
              </label>
              <input
                type="number"
                step="0.5"
                value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="btn btn-gold"
            style={{ height: '36px', padding: '0 20px', whiteSpace: 'nowrap' }}
          >
            <Play size={14} style={{ fill: '#070a12' }} />
            <span>{isRunning ? 'Simulating...' : 'Run Backtest'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {/* Net Profit */}
        <div className="nx-card">
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>NET PROFIT / LOSS</div>
          <div className="mono text-buy" style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0' }}>
            +${metrics.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-buy)' }}>
            +{metrics.net_profit_pct.toFixed(1)}% Return on Equity
          </div>
        </div>

        {/* Win Rate */}
        <div className="nx-card">
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>WIN RATE</div>
          <div className="mono text-gold" style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0' }}>
            {metrics.win_rate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            {metrics.winning_trades} Wins / {metrics.losing_trades} Losses ({metrics.total_trades} Total)
          </div>
        </div>

        {/* Profit Factor */}
        <div className="nx-card">
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>PROFIT FACTOR</div>
          <div className="mono" style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0', color: '#fff' }}>
            {metrics.profit_factor.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Gross Profit vs Gross Loss
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="nx-card">
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>MAX DRAWDOWN</div>
          <div className="mono text-sell" style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0' }}>
            {metrics.max_drawdown_pct.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Peak-to-trough capital dip
          </div>
        </div>

        {/* Average R:R */}
        <div className="nx-card">
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>AVERAGE R-MULTIPLE</div>
          <div className="mono text-cyan" style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0' }}>
            {metrics.avg_r.toFixed(2)}R
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Realized reward per unit risk
          </div>
        </div>
      </div>

      {/* 3. Equity Curve Visualizer */}
      <div className="nx-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="nx-card-header" style={{ padding: '12px 16px', margin: '0' }}>
          <span className="nx-card-title">
            <TrendingUp size={15} color="var(--gold-primary)" />
            WALK-FORWARD EQUITY GROWTH CURVE
          </span>
          <span className="badge badge-gold">INITIAL BALANCE: ${initialBalance.toLocaleString()}</span>
        </div>

        <EquityCurveCanvas
          equityPoints={equityPoints}
          initialBalance={initialBalance}
          height={240}
        />
      </div>

      {/* 4. Historical Trades Table */}
      <div className="nx-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="nx-card-header" style={{ padding: '12px 16px', margin: '0' }}>
          <span className="nx-card-title">
            <Target size={15} color="var(--gold-primary)" />
            SIMULATED TRADE EXECUTION LOG
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{trades.length} Trades Recorded</span>
        </div>

        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>#</th>
                <th>TIME</th>
                <th>TYPE</th>
                <th>ENTRY PRICE</th>
                <th>EXIT PRICE</th>
                <th>OUTCOME</th>
                <th>NET PNL ($)</th>
                <th>R:R ACHIEVED</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, idx) => {
                const isWin = t.outcome === 'WIN';
                return (
                  <tr key={idx}>
                    <td className="mono" style={{ color: 'var(--text-dim)' }}>{t.trade_num || idx + 1}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{t.time}</td>
                    <td>
                      <span className={`badge ${t.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>{t.entry.toFixed(2)}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{t.exit.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${isWin ? 'badge-buy' : 'badge-sell'}`}>
                        {t.outcome}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: isWin ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                    </td>
                    <td className="mono text-gold" style={{ fontWeight: 600 }}>
                      {t.rr > 0 ? `+${t.rr.toFixed(1)}R` : `${t.rr.toFixed(1)}R`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
