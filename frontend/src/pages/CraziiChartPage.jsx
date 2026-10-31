import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Target,
  RefreshCw,
  Loader,
  AlertTriangle,
  Shield,
  DollarSign,
  XCircle,
  Zap,
  CheckCircle2
} from 'lucide-react';
import CraziiCanvasChart from '../components/CraziiCanvasChart.jsx';
import { api } from '../services/api.js';
import { audioAlerts } from '../utils/audioAlerts.js';

export default function CraziiChartPage({
  symbol,
  timeframe,
  marketData,
  analysisData,
  onExecuteTrade
}) {
  const [lotSize, setLotSize] = useState('0.10');
  const [slOffset, setSlOffset] = useState('');
  const [tpOffset, setTpOffset] = useState('');

  // Active Open Positions for Paper Trading & Live PnL
  const [activeTrades, setActiveTrades] = useState(() => {
    try {
      const saved = localStorage.getItem('nexora_active_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexora_active_positions', JSON.stringify(activeTrades));
    } catch {}
  }, [activeTrades]);

  // Self-managed candle + analysis state for this page
  const [localCandles, setLocalCandles] = useState([]);
  const [localAnalysis, setLocalAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isMounted = useRef(true);

  const fetchPageData = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const [analysisRes, candlesRes] = await Promise.allSettled([
        api.getAnalysis(symbol, timeframe),
        api.getCandles(symbol, timeframe, 250)
      ]);

      if (!isMounted.current) return;

      // Merge candles: prefer analysis candles, fallback to dedicated candle endpoint
      let candles = [];
      if (analysisRes.status === 'fulfilled' && analysisRes.value?.candles?.length >= 5) {
        candles = analysisRes.value.candles;
        setLocalAnalysis(analysisRes.value);
      } else if (analysisRes.status === 'fulfilled' && analysisRes.value) {
        setLocalAnalysis(analysisRes.value);
      }

      if (candles.length < 5 && candlesRes.status === 'fulfilled' && candlesRes.value?.candles?.length >= 5) {
        candles = candlesRes.value.candles;
      }

      if (candles.length >= 5) {
        setLocalCandles(candles);
        setError(null);
      } else {
        setError('No candle data available for this symbol/timeframe. Backend may still be loading.');
      }

      setLastUpdated(new Date());
    } catch (err) {
      if (isMounted.current) {
        setError(`Fetch error: ${err.message}`);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    isMounted.current = true;
    fetchPageData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchPageData, 15000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchPageData]);

  // Merge parent data with self-fetched local data
  const effectiveAnalysis = localAnalysis || analysisData || {};
  const effectiveCandles = localCandles.length >= 5 ? localCandles : (analysisData?.candles || []);

  const signal = effectiveAnalysis?.signal || {};
  const crazii = effectiveAnalysis?.crazii || {};
  const ind = effectiveAnalysis?.indicators?.latest || {};

  const currentPrice = effectiveAnalysis?.latest_price || marketData?.latest_price || marketData?.price || 0;
  const isSell = signal.direction === 'SELL';
  const suggestedEntry = signal.entry || signal.entry_price || currentPrice;
  const suggestedSl = signal.sl || signal.sl_price || (currentPrice > 0 ? (isSell ? currentPrice * 1.006 : currentPrice * 0.994) : 0);
  const suggestedTp = signal.tp1 || signal.tp1_price || (currentPrice > 0 ? (isSell ? currentPrice * 0.985 : currentPrice * 1.015) : 0);

  const currentActiveTrade = activeTrades.find(t => t.symbol === symbol);

  // Floating PnL calculation
  let floatingPnlUsd = 0;
  let floatingPnlPct = 0;
  if (currentActiveTrade && currentPrice > 0) {
    const isTradeBuy = currentActiveTrade.direction === 'BUY';
    const diff = isTradeBuy ? (currentPrice - currentActiveTrade.entry_price) : (currentActiveTrade.entry_price - currentPrice);
    floatingPnlPct = (diff / currentActiveTrade.entry_price) * 100;
    const multiplier = symbol.includes('XAU') ? 100 : (symbol.includes('BTC') ? 1 : 10000);
    floatingPnlUsd = diff * currentActiveTrade.lot_size * multiplier;
  }

  const handleQuickTrade = (direction) => {
    const lot = parseFloat(lotSize) || 0.1;
    const sl = parseFloat(slOffset) || suggestedSl;
    const tp = parseFloat(tpOffset) || suggestedTp;
    const entry = currentPrice;

    const newTrade = {
      id: Date.now().toString(),
      symbol,
      timeframe,
      direction,
      entry_price: entry,
      sl_price: sl,
      tp_price: tp,
      lot_size: lot,
      open_time: Date.now()
    };

    setActiveTrades(prev => [newTrade, ...prev.filter(t => t.symbol !== symbol)]);

    if (direction === 'BUY') {
      audioAlerts.playBuySound();
      audioAlerts.speak(`Buy order opened on ${symbol} at ${entry.toFixed(2)}`);
    } else {
      audioAlerts.playSellSound();
      audioAlerts.speak(`Sell order opened on ${symbol} at ${entry.toFixed(2)}`);
    }

    if (onExecuteTrade) {
      onExecuteTrade({
        ...newTrade,
        strategy_tags: 'CRAZII_PRO_TERMINAL'
      });
    }
  };

  const handleCloseTrade = () => {
    if (!currentActiveTrade) return;
    audioAlerts.playCashChime();
    audioAlerts.speak(`Position closed. ${floatingPnlUsd >= 0 ? 'Profit' : 'Loss'} ${Math.abs(floatingPnlUsd).toFixed(2)} dollars.`);
    setActiveTrades(prev => prev.filter(t => t.id !== currentActiveTrade.id));
  };

  const handleSetBreakEven = () => {
    if (!currentActiveTrade) return;
    audioAlerts.playPing();
    audioAlerts.speak("Stop loss moved to break even");
    setActiveTrades(prev => prev.map(t => {
      if (t.id === currentActiveTrade.id) {
        return { ...t, sl_price: t.entry_price };
      }
      return t;
    }));
  };

  const signalDir = signal.direction || 'WAIT';
  const signalBadgeClass = signalDir === 'BUY' ? 'badge-buy' : signalDir === 'SELL' ? 'badge-sell' : 'badge-wait';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>

      {/* 1. Tactical HUD Header */}
      <div
        className="nx-card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>INSTRUMENT</span>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              {symbol} <span style={{ fontSize: '12px', color: 'var(--gold-primary)' }}>{timeframe}</span>
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>CRAZII OP BIAS</span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: crazii?.op?.bias === 'BUY_ONLY' ? 'var(--color-buy)' : 'var(--color-sell)' }}>
              {crazii?.op?.badge || (crazii?.op?.bias === 'SELL_ONLY' ? '▼ SELL ONLY' : '▲ BUY ONLY')}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>MLP EQUILIBRIUM</span>
            <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cyan-neon)' }}>
              {crazii?.mlp?.price ? crazii.mlp.price.toFixed(2) : (currentPrice > 0 ? (currentPrice * 0.998).toFixed(2) : '--')}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>KSI BIG BOYS FLOW</span>
            <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: (crazii?.ksi?.score || 50) >= 50 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
              {crazii?.ksi?.score ?? 50}% FLOW
            </div>
          </div>

          {/* Source Tag */}
          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>DATA FEED</span>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gold-primary)' }}>
              {effectiveAnalysis?.source || effectiveAnalysis?.provider || 'NEXORA AUTO'}
            </div>
          </div>
        </div>

        {/* Right: score + signal + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchPageData}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-dim)',
              padding: '5px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px'
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Loading...' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Refresh'}
          </button>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>CONFLUENCE</div>
            <div className="mono" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gold-primary)' }}>
              {signal.setup_score ?? 75}/100
            </div>
          </div>
          <span
            className={`badge ${signalBadgeClass}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {signalDir} SIGNAL
          </span>
        </div>
      </div>

      {/* 2. Main Terminal Grid: Chart (Left) + Execution Pad (Right) */}
      <div className="crazii-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '12px' }}>

        {/* Full Tactical HTML5 Canvas Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', backgroundColor: 'rgba(255, 51, 102, 0.1)',
              border: '1px solid rgba(255, 51, 102, 0.3)', borderRadius: 'var(--radius-sm)',
              fontSize: '11px', color: 'var(--color-sell)'
            }}>
              <AlertTriangle size={14} />
              {error}
              <button onClick={fetchPageData} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', fontSize: '11px' }}>
                Retry
              </button>
            </div>
          )}

          {/* Loading overlay status */}
          {loading && effectiveCandles.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', backgroundColor: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-sm)',
              fontSize: '11px', color: 'var(--gold-primary)'
            }}>
              <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
              Fetching live candle data for {symbol} {timeframe}...
            </div>
          )}

          <CraziiCanvasChart
            candles={effectiveCandles}
            craziiData={crazii}
            indicators={effectiveAnalysis?.indicators}
            marketStructure={effectiveAnalysis?.market_structure}
            signal={signal}
            activeTrade={currentActiveTrade}
            symbol={symbol}
            timeframe={timeframe}
            height={540}
          />

          {/* Multi-Timeframe Alignment Ribbon */}
          <div
            className="nx-card"
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#090e1a'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} color="var(--gold-primary)" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                MULTI-TIMEFRAME ALIGNMENT:
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {['M5', 'M15', 'M30', 'H1', 'H4', 'D1'].map((tf) => {
                const tfTrend = effectiveAnalysis?.mtf?.[tf]?.trend || (signalDir !== 'WAIT' ? signalDir + 'ISH' : 'NEUTRAL');
                const isActive = tf === timeframe;
                const isBull = tfTrend?.toUpperCase().includes('BUY') || tfTrend?.toUpperCase().includes('BULL');
                const isBear = tfTrend?.toUpperCase().includes('SELL') || tfTrend?.toUpperCase().includes('BEAR');
                return (
                  <div
                    key={tf}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: isActive ? 'rgba(212, 175, 55, 0.2)' : isBull ? 'rgba(0, 230, 118, 0.08)' : isBear ? 'rgba(255, 51, 102, 0.08)' : 'rgba(0,0,0,0.3)',
                      border: '1px solid',
                      borderColor: isActive ? 'var(--gold-primary)' : isBull ? 'rgba(0, 230, 118, 0.3)' : isBear ? 'rgba(255, 51, 102, 0.3)' : 'var(--border-subtle)',
                      color: isActive ? 'var(--gold-primary)' : isBull ? 'var(--color-buy)' : isBear ? 'var(--color-sell)' : 'var(--text-dim)'
                    }}
                    className="mono"
                  >
                    {tf}: {isBull ? 'BULL' : isBear ? 'BEAR' : 'NEUT'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* EMA Quick View Bar */}
          {(ind.ema9 || ind.ema_fast) && (
            <div
              style={{
                display: 'flex', gap: '8px',
                backgroundColor: '#090e1a',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px'
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginRight: '6px' }}>EMA:</span>
              {[
                { label: '9', val: ind.ema9 || ind.ema_fast, color: '#38bdf8' },
                { label: '21', val: ind.ema21 || ind.ema_medium, color: '#fbbf24' },
                { label: '50', val: ind.ema50 || ind.ema_slow, color: '#c084fc' },
                { label: '200', val: ind.ema200 || ind.ema_baseline, color: 'var(--gold-primary)' }
              ].map(({ label, val, color }) => val ? (
                <span key={label} className="mono" style={{ fontSize: '11px', color, fontWeight: 600 }}>
                  {label}: {val.toFixed(2)}
                </span>
              ) : null)}
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-dim)' }}>
                RSI: <span className="mono" style={{ color: (ind.rsi || 50) > 70 ? 'var(--color-sell)' : (ind.rsi || 50) < 30 ? 'var(--color-buy)' : '#fff' }}>
                  {(ind.rsi || '--')}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* 1-Click Fast Execution Pad */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="nx-card-header">
              <span className="nx-card-title">
                <Target size={14} color="var(--gold-primary)" />
                1-CLICK EXECUTION PAD
              </span>
              <span className="live-pulse-dot" />
            </div>

            {/* Price Display */}
            <div style={{ textAlign: 'center', margin: '12px 0', padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>CURRENT BID / ASK</div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: currentPrice > 0 ? '#fff' : 'var(--text-dim)' }}>
                {currentPrice > 0 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '3px' }}>
                {effectiveAnalysis?.source || 'Awaiting data...'}
              </div>
            </div>

            {/* Lot Size Preset Buttons */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>LOT SIZE (VOLUME)</div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                style={{ marginBottom: '6px' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {['0.01', '0.05', '0.10', '0.50'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setLotSize(val)}
                    className="btn btn-subtle"
                    style={{
                      padding: '4px 0',
                      fontSize: '10.5px',
                      borderColor: lotSize === val ? 'var(--gold-primary)' : 'var(--border-subtle)',
                      backgroundColor: lotSize === val ? 'rgba(212,175,55,0.1)' : 'transparent',
                      color: lotSize === val ? 'var(--gold-primary)' : 'var(--text-muted)'
                    }}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* SL / TP Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-sell)', marginBottom: '3px' }}>
                  <span>STOP LOSS</span>
                  <span className="mono">Target: {suggestedSl > 0 ? suggestedSl.toFixed(2) : '--'}</span>
                </div>
                <input
                  type="number"
                  placeholder={suggestedSl > 0 ? suggestedSl.toFixed(2) : 'e.g. 3850.00'}
                  value={slOffset}
                  onChange={(e) => setSlOffset(e.target.value)}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-buy)', marginBottom: '3px' }}>
                  <span>TAKE PROFIT (TP1)</span>
                  <span className="mono">Target: {suggestedTp > 0 ? suggestedTp.toFixed(2) : '--'}</span>
                </div>
                <input
                  type="number"
                  placeholder={suggestedTp > 0 ? suggestedTp.toFixed(2) : 'e.g. 3920.00'}
                  value={tpOffset}
                  onChange={(e) => setTpOffset(e.target.value)}
                />
              </div>
            </div>

            {/* Signal Execution Levels */}
            {(signal.tp2 || signal.tp2_price) && (
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>TP2</span>
                  <span className="mono" style={{ color: 'var(--color-buy)' }}>{(signal.tp2 || signal.tp2_price)?.toFixed(2)}</span>
                </div>
                {(signal.tp3 || signal.tp3_price) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>TP3 Runner</span>
                    <span className="mono" style={{ color: 'var(--color-buy)' }}>{(signal.tp3 || signal.tp3_price)?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* R:R Preview */}
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}
            >
              <span style={{ color: 'var(--text-dim)' }}>R:R Ratio:</span>
              <span className="mono" style={{ color: 'var(--gold-primary)', fontWeight: 700 }}>
                1 : {signal.rr_ratio ? signal.rr_ratio.toFixed(1) : '2.5'}
              </span>
            </div>

            {/* Live Active Position & Floating PnL Card */}
            {currentActiveTrade && (
              <div
                style={{
                  backgroundColor: floatingPnlUsd >= 0 ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 51, 102, 0.08)',
                  border: `1px solid ${floatingPnlUsd >= 0 ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 51, 102, 0.3)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: currentActiveTrade.direction === 'BUY' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 51, 102, 0.2)',
                        color: currentActiveTrade.direction === 'BUY' ? 'var(--color-buy)' : 'var(--color-sell)'
                      }}
                    >
                      {currentActiveTrade.direction === 'BUY' ? '▲ BUY' : '▼ SELL'} {currentActiveTrade.lot_size}L
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      @{currentActiveTrade.entry_price?.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="live-pulse-dot" style={{ backgroundColor: floatingPnlUsd >= 0 ? '#00e676' : '#ff3366' }} />
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-dim)' }}>LIVE PnL</span>
                  </div>
                </div>

                {/* Floating Profit Amount */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: '18px',
                      fontWeight: 900,
                      color: floatingPnlUsd >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'
                    }}
                  >
                    {floatingPnlUsd >= 0 ? '+' : ''}${floatingPnlUsd.toFixed(2)}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: floatingPnlUsd >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'
                    }}
                  >
                    {floatingPnlPct >= 0 ? '+' : ''}{floatingPnlPct.toFixed(2)}%
                  </div>
                </div>

                {/* Position Controls: Close & Move SL to BE */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', marginTop: '4px' }}>
                  <button
                    onClick={handleCloseTrade}
                    className="btn"
                    style={{
                      padding: '8px 6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: floatingPnlUsd >= 0 ? 'var(--color-buy)' : 'var(--color-sell)',
                      color: '#070a12',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <DollarSign size={13} />
                    Bank PnL
                  </button>
                  <button
                    onClick={handleSetBreakEven}
                    className="btn btn-subtle"
                    style={{
                      padding: '8px 6px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    title="Move Stop Loss to Entry Price (Zero Risk)"
                  >
                    <Shield size={12} color="var(--gold-primary)" />
                    Break-Even
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BUY / SELL Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => handleQuickTrade('BUY')}
              className="btn btn-buy"
              style={{ padding: '14px 10px', fontSize: '13px', fontWeight: 800 }}
            >
              <TrendingUp size={16} />
              BUY<br />(LONG)
            </button>
            <button
              onClick={() => handleQuickTrade('SELL')}
              className="btn btn-sell"
              style={{ padding: '14px 10px', fontSize: '13px', fontWeight: 800 }}
            >
              <TrendingDown size={16} />
              SELL<br />(SHORT)
            </button>
          </div>
        </div>
      </div>

      {/* 3. Signal Reasons Strip */}
      {signal.reasons && signal.reasons.length > 0 && (
        <div
          className="nx-card"
          style={{ padding: '10px 14px' }}
        >
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={11} color="var(--gold-primary)" />
            ALGORITHMIC CONFLUENCE DRIVERS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {signal.reasons.map((r, i) => (
              <span
                key={i}
                style={{
                  fontSize: '10.5px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(0, 230, 118, 0.07)',
                  border: '1px solid rgba(0, 230, 118, 0.2)',
                  color: 'var(--text-muted)'
                }}
              >
                ✓ {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
