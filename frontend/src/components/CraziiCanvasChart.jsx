import React, { useRef, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';

export default function CraziiCanvasChart({
  candles = [],
  craziiData = null,
  indicators = null,
  marketStructure = null,
  signal = null,
  activeTrade = null,
  symbol = 'XAUUSD',
  timeframe = 'M15',
  height = 520
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Candles fallback state
  const [internalCandles, setInternalCandles] = useState([]);
  const [fetchStatus, setFetchStatus] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'
  const [mtfSrLevels, setMtfSrLevels] = useState([]);

  // Fetch Multi-Timeframe (15m, 1h, 4h, 1d) Support & Resistance Levels
  useEffect(() => {
    let isMounted = true;
    api.getMtfMatrix(symbol)
      .then(res => {
        if (isMounted && res?.all_sr_levels) {
          setMtfSrLevels(res.all_sr_levels);
        }
      })
      .catch(e => console.error("MTF S/R fetch error:", e));
    return () => { isMounted = false; };
  }, [symbol]);

  useEffect(() => {
    if (candles && candles.length >= 5) {
      setInternalCandles(candles);
      setFetchStatus('done');
      return;
    }

    // Auto-fetch when parent did not supply enough candles
    let isMounted = true;
    setFetchStatus('loading');

    const tryFetch = async () => {
      try {
        // Try dedicated candles endpoint first
        const res = await api.getCandles(symbol, timeframe, 250);
        if (isMounted && res?.candles?.length >= 5) {
          setInternalCandles(res.candles);
          setFetchStatus('done');
          return;
        }
        // Fallback: pull from analysis endpoint which always embeds candles
        const analysis = await api.getAnalysis(symbol, timeframe);
        if (isMounted && analysis?.candles?.length >= 5) {
          setInternalCandles(analysis.candles);
          setFetchStatus('done');
          return;
        }
        if (isMounted) setFetchStatus('error');
      } catch (e) {
        console.error('CraziiCanvasChart candle fetch error:', e);
        if (isMounted) setFetchStatus('error');
      }
    };

    tryFetch();
    return () => { isMounted = false; };
  }, [candles, symbol, timeframe]);

  const activeCandles = (candles && candles.length >= 5) ? candles : internalCandles;

  // Chart view state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [mousePos, setMousePos] = useState(null);

  // Indicators toggle state
  const [showOpLine, setShowOpLine] = useState(true);
  const [showMlpLine, setShowMlpLine] = useState(true);
  const [showCcryColors, setShowCcryColors] = useState(true);
  const [showDiamonds, setShowDiamonds] = useState(true);
  const [showBuySellBadges, setShowBuySellBadges] = useState(true);
  const [showEmas, setShowEmas] = useState(true);
  const [showSrZones, setShowSrZones] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Reset view on symbol or timeframe change
  useEffect(() => {
    setZoom(1);
    setPanOffset(0);
    setMousePos(null);
  }, [symbol, timeframe]);

  // Main Render Routine
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== canvasHeight * dpr) {
      canvas.width = width * dpr;
      canvas.height = canvasHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Dark Navy background
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, width, canvasHeight);

    if (!activeCandles || activeCandles.length < 5) {
      // Loading indicator
      ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
      ctx.fillRect(width / 2 - 180, canvasHeight / 2 - 30, 360, 60);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - 180, canvasHeight / 2 - 30, 360, 60);

      ctx.fillStyle = fetchStatus === 'error' ? '#ff3366' : '#d4af37';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        fetchStatus === 'error'
          ? '⚠ Failed to load candle data — click Refresh'
          : fetchStatus === 'loading'
            ? '◎ Fetching candle data...'
            : '◎ Awaiting candle data...',
        width / 2,
        canvasHeight / 2 - 5
      );
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`Symbol: ${symbol}  TF: ${timeframe}`, width / 2, canvasHeight / 2 + 14);
      ctx.restore();
      return;
    }

    // Geometry margins
    const marginRight = 65;
    const marginBottom = 28;
    const marginTop = 30;
    const chartWidth = width - marginRight;
    const chartHeight = canvasHeight - marginBottom - marginTop;
    const volumeHeight = showVolume ? 60 : 0;
    const pricePlotHeight = chartHeight - volumeHeight;

    // Visible candle calculation
    const baseCandleWidth = 8;
    const candleWidth = Math.max(3, Math.min(24, baseCandleWidth * zoom));
    const candleSpacing = Math.max(2, candleWidth * 0.35);
    const candleSlot = candleWidth + candleSpacing;

    const visibleCount = Math.floor(chartWidth / candleSlot);
    const totalCandles = activeCandles.length;

    // Right-aligned with panOffset
    let endIdx = totalCandles - panOffset;
    if (endIdx > totalCandles) endIdx = totalCandles;
    let startIdx = endIdx - visibleCount;
    if (startIdx < 0) {
      startIdx = 0;
      endIdx = Math.min(totalCandles, visibleCount);
    }

    const visibleCandles = activeCandles.slice(startIdx, endIdx);
    if (visibleCandles.length === 0) {
      ctx.restore();
      return;
    }

    // Price scaling (min / max)
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    visibleCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume && c.volume > maxVol) maxVol = c.volume;
    });

    // Add padding to price scale (8%)
    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;
    const effectiveRange = maxPrice - minPrice;

    const priceToY = (price) => {
      return marginTop + pricePlotHeight - ((price - minPrice) / effectiveRange) * pricePlotHeight;
    };

    const yToPrice = (y) => {
      const ratio = (marginTop + pricePlotHeight - y) / pricePlotHeight;
      return minPrice + ratio * effectiveRange;
    };

    // 1. Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Horizontal price grid
    const priceStepCount = 7;
    for (let i = 0; i <= priceStepCount; i++) {
      const p = minPrice + (effectiveRange / priceStepCount) * i;
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price text on right scale
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(p > 100 ? 2 : 4), chartWidth + 6, y + 3);
    }

    // 2. Clean Key Support & Resistance (Nearest key levels only, filtered to avoid clutter)
    if (showSrZones) {
      const tfColors = {
        'D1': { color: 'rgba(255, 0, 127, 0.7)', label: '1D', dash: [6, 4] },
        'H4': { color: 'rgba(212, 175, 55, 0.7)', label: '4H', dash: [5, 3] },
        'H1': { color: 'rgba(0, 229, 255, 0.65)', label: '1H', dash: [4, 3] },
        'M15': { color: 'rgba(56, 189, 248, 0.6)', label: '15M', dash: [3, 3] }
      };

      // Filter to keep only distinct levels separated by at least 0.5% price distance
      const rawLevels = mtfSrLevels.length > 0
        ? mtfSrLevels
        : (marketStructure?.support_resistance || []).map(s => ({ ...s, timeframe }));

      const filteredLevels = [];
      const sortedByPrice = [...rawLevels].sort((a, b) => b.price - a.price);

      for (const lvl of sortedByPrice) {
        if (lvl.price < minPrice || lvl.price > maxPrice) continue;
        const tooClose = filteredLevels.some(existing => Math.abs(existing.price - lvl.price) / lvl.price < 0.007);
        if (!tooClose && filteredLevels.length < 5) {
          filteredLevels.push(lvl);
        }
      }

      filteredLevels.forEach((sr) => {
        const srY = priceToY(sr.price);
        const cfg = tfColors[sr.timeframe] || { color: 'rgba(100, 116, 139, 0.6)', label: sr.timeframe || 'SR', dash: [4, 4] };
        
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 1;
        ctx.setLineDash(cfg.dash);
        ctx.beginPath();
        ctx.moveTo(0, srY);
        ctx.lineTo(chartWidth, srY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Clean small tag on the right axis
        const tagText = `${cfg.label} ${sr.type === 'RESISTANCE' ? 'R' : 'S'} ${sr.price.toFixed(sr.price > 100 ? 1 : 4)}`;
        ctx.fillStyle = cfg.color;
        ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(tagText, chartWidth - 8, srY - 3);
      });
    }

    // 3. CRAZII OP (Opening Price) Master Line
    if (showOpLine && craziiData?.op?.price) {
      const op = craziiData.op.price;
      if (op >= minPrice && op <= maxPrice) {
        const opY = priceToY(op);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, opY);
        ctx.lineTo(chartWidth, opY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`OP: ${op.toFixed(2)} (${craziiData.op.bias})`, 10, opY - 4);
      }
    }

    // 4. CRAZII MLP (Mid-Level Price) Line
    if (showMlpLine && craziiData?.mlp?.price) {
      const mlp = craziiData.mlp.price;
      if (mlp >= minPrice && mlp <= maxPrice) {
        const mlpY = priceToY(mlp);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, mlpY);
        ctx.lineTo(chartWidth, mlpY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`MLP: ${mlp.toFixed(2)}`, 10, mlpY - 4);
      }
    }

    // 5. Volume Sub-plot
    if (showVolume && maxVol > 0) {
      const volBaseY = marginTop + chartHeight;
      visibleCandles.forEach((c, idx) => {
        const x = idx * candleSlot + candleWidth / 2;
        const vHeight = (c.volume / maxVol) * (volumeHeight - 8);
        const y = volBaseY - vHeight;
        const isUp = c.close >= c.open;
        ctx.fillStyle = isUp ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 51, 102, 0.2)';
        ctx.fillRect(x - candleWidth / 2, y, candleWidth, vHeight);
      });
    }

    // 6. Draw Candlesticks & CCRY Colors
    visibleCandles.forEach((c, idx) => {
      const x = idx * candleSlot + candleWidth / 2;
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const isBullish = c.close >= c.open;
      let candleColor = isBullish ? '#00e676' : '#ff3366';

      // CCRY algorithmic color overrides
      if (showCcryColors && craziiData?.classified_candles) {
        const globalIdx = startIdx + idx;
        const classified = craziiData.classified_candles[globalIdx];
        if (classified) {
          if (classified.color === 'CYAN') candleColor = '#00e5ff'; // Strong bullish momentum
          else if (classified.color === 'MAGENTA') candleColor = '#ff007f'; // Strong bearish momentum
          else if (classified.color === 'YELLOW') candleColor = '#f59e0b'; // Exhaustion / trap warning
          else if (classified.color === 'GRAY') candleColor = '#64748b'; // Consolidation
        }
      }

      // Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillStyle = candleColor;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // 7. CRAZII Diamond Signals (DML)
      if (showDiamonds && craziiData?.classified_candles) {
        const globalIdx = startIdx + idx;
        const classified = craziiData.classified_candles[globalIdx];
        if (classified && classified.diamond) {
          const diamondY = classified.diamond === 'BUY' ? lowY + 12 : highY - 12;
          const diamondColor = classified.diamond === 'BUY' ? '#00e5ff' : '#ff007f';

          ctx.fillStyle = diamondColor;
          ctx.beginPath();
          ctx.moveTo(x, diamondY - 5);
          ctx.lineTo(x + 5, diamondY);
          ctx.lineTo(x, diamondY + 5);
          ctx.lineTo(x - 5, diamondY);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 7b. BUY / SELL Signal Badges directly on Candle (Clean subtle badge)
      if (showBuySellBadges) {
        const globalIdx = startIdx + idx;
        let candleSignal = null;

        // Check if CRAZII classified candle has signal or diamond
        if (craziiData?.classified_candles?.[globalIdx]) {
          const item = craziiData.classified_candles[globalIdx];
          if (item.signal === 'BUY' || item.diamond === 'BUY') candleSignal = 'BUY';
          else if (item.signal === 'SELL' || item.diamond === 'SELL') candleSignal = 'SELL';
        }

        // On the latest active candle, ALWAYS respect the primary Signal Engine direction
        if (idx === visibleCandles.length - 1) {
          const primaryDir = signal?.direction;
          if (primaryDir === 'BUY' || primaryDir === 'SELL') {
            candleSignal = primaryDir;
          }
        }

        if (candleSignal) {
          const isBuy = candleSignal === 'BUY';
          const badgeY = isBuy ? lowY + 14 : highY - 14;
          const badgeColor = isBuy ? '#00e676' : '#ff3366';
          const arrowDir = isBuy ? '▲' : '▼';

          // Clean small pill container (no blurry box overlap)
          ctx.save();
          ctx.fillStyle = isBuy ? 'rgba(0, 230, 118, 0.95)' : 'rgba(255, 51, 102, 0.95)';
          const pillW = 32;
          const pillH = 13;
          ctx.fillRect(x - pillW / 2, badgeY - pillH / 2, pillW, pillH);

          // Label Text
          ctx.fillStyle = '#070a12';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${arrowDir} ${candleSignal}`, x, badgeY + 2.5);
          ctx.restore();
        }
      }
    });

    // 7c. Active Position & Live PnL Overlay (Entry, SL, TP lines)
    if (activeTrade && activeTrade.entry_price) {
      const isBuy = activeTrade.direction === 'BUY';
      const entryY = priceToY(activeTrade.entry_price);

      // Entry line (Cyan dashed)
      if (entryY >= marginTop && entryY <= marginTop + chartHeight) {
        ctx.save();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(0, entryY);
        ctx.lineTo(chartWidth, entryY);
        ctx.stroke();

        // Right axis tag
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(chartWidth, entryY - 9, marginRight - 2, 18);
        ctx.fillStyle = '#070a12';
        ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ENTRY ${activeTrade.direction}`, chartWidth + marginRight / 2 - 1, entryY + 3.5);
        ctx.restore();
      }

      // Stop Loss line (Red dashed)
      if (activeTrade.sl_price) {
        const slY = priceToY(activeTrade.sl_price);
        if (slY >= marginTop && slY <= marginTop + chartHeight) {
          ctx.save();
          ctx.strokeStyle = '#ff3366';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, slY);
          ctx.lineTo(chartWidth, slY);
          ctx.stroke();

          ctx.fillStyle = '#ff3366';
          ctx.fillRect(chartWidth, slY - 8, marginRight - 2, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SL RISK', chartWidth + marginRight / 2 - 1, slY + 3);
          ctx.restore();
        }
      }

      // Take Profit line (Green dashed)
      if (activeTrade.tp_price) {
        const tpY = priceToY(activeTrade.tp_price);
        if (tpY >= marginTop && tpY <= marginTop + chartHeight) {
          ctx.save();
          ctx.strokeStyle = '#00e676';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, tpY);
          ctx.lineTo(chartWidth, tpY);
          ctx.stroke();

          ctx.fillStyle = '#00e676';
          ctx.fillRect(chartWidth, tpY - 8, marginRight - 2, 16);
          ctx.fillStyle = '#070a12';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('TP TARGET', chartWidth + marginRight / 2 - 1, tpY + 3);
          ctx.restore();
        }
      }
    }

    // 8. Crosshair & Axis Tags
    if (mousePos && mousePos.x >= 0 && mousePos.x <= chartWidth && mousePos.y >= marginTop && mousePos.y <= marginTop + chartHeight) {
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, marginTop);
      ctx.lineTo(mousePos.x, marginTop + chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label on right axis
      const hoverPrice = yToPrice(mousePos.y);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(chartWidth, mousePos.y - 10, marginRight, 20);
      ctx.fillStyle = '#070a12';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hoverPrice.toFixed(hoverPrice > 100 ? 2 : 4), chartWidth + marginRight / 2, mousePos.y + 4);

      // Candle Time label on bottom axis
      const hoveredSlotIdx = Math.floor(mousePos.x / candleSlot);
      if (hoveredSlotIdx >= 0 && hoveredSlotIdx < visibleCandles.length) {
        const hCandle = visibleCandles[hoveredSlotIdx];
        const dateStr = new Date((hCandle.time || Date.now() / 1000) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(mousePos.x - 24, marginTop + chartHeight, 48, 18);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dateStr, mousePos.x, marginTop + chartHeight + 13);
      }
    }

    ctx.restore();
  }, [
    activeCandles,
    craziiData,
    indicators,
    marketStructure,
    signal,
    activeTrade,
    zoom,
    panOffset,
    mousePos,
    showOpLine,
    showMlpLine,
    showCcryColors,
    showDiamonds,
    showBuySellBadges,
    showSrZones,
    mtfSrLevels,
    showVolume,
    fetchStatus
  ]);

  // Request Animation Frame on redraw
  useEffect(() => {
    let animId;
    const render = () => {
      drawChart();
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [drawChart]);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(3.5, z * 1.1));
    } else {
      setZoom((z) => Math.max(0.4, z / 1.1));
    }
  };

  // Drag to pan
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const candleSlot = 10 * zoom;
      const candlesMoved = Math.round(deltaX / candleSlot);
      if (candlesMoved !== 0) {
        setPanOffset((p) => Math.max(0, p + candlesMoved));
        setDragStartX(e.clientX);
      }
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => {
    setIsDragging(false);
    setMousePos(null);
  };

  return (
    <div
      ref={containerRef}
      className="nx-card"
      style={{
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: `${height}px`,
        position: 'relative'
      }}
    >
      {/* Chart Ribbon Toolbar */}
      <div
        className="scrollable-ribbon"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: '#090e1a',
          overflowX: 'auto',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', letterSpacing: '0.05em' }}>
            CRAZII ENGINE
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>|</span>

          {/* Toggle OP Line */}
          <button
            onClick={() => setShowOpLine(!showOpLine)}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              fontWeight: 600,
              borderRadius: '2px',
              border: '1px solid',
              borderColor: showOpLine ? 'var(--gold-primary)' : 'var(--border-subtle)',
              backgroundColor: showOpLine ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: showOpLine ? 'var(--gold-primary)' : 'var(--text-dim)',
              cursor: 'pointer'
            }}
          >
            OP Line
          </button>

          {/* Toggle MLP Line */}
          <button
            onClick={() => setShowMlpLine(!showMlpLine)}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              fontWeight: 600,
              borderRadius: '2px',
              border: '1px solid',
              borderColor: showMlpLine ? 'var(--cyan-neon)' : 'var(--border-subtle)',
              backgroundColor: showMlpLine ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
              color: showMlpLine ? 'var(--cyan-neon)' : 'var(--text-dim)',
              cursor: 'pointer'
            }}
          >
            MLP Line
          </button>

          {/* Toggle CCRY Colors */}
          <button
            onClick={() => setShowCcryColors(!showCcryColors)}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              fontWeight: 600,
              borderRadius: '2px',
              border: '1px solid',
              borderColor: showCcryColors ? 'var(--crazii-magenta)' : 'var(--border-subtle)',
              backgroundColor: showCcryColors ? 'rgba(255, 0, 127, 0.15)' : 'transparent',
              color: showCcryColors ? 'var(--crazii-magenta)' : 'var(--text-dim)',
              cursor: 'pointer'
            }}
          >
            CCRY Colors
          </button>

          {/* Toggle Diamonds */}
          <button
            onClick={() => setShowDiamonds(!showDiamonds)}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              fontWeight: 600,
              borderRadius: '2px',
              border: '1px solid',
              borderColor: showDiamonds ? '#c084fc' : 'var(--border-subtle)',
              backgroundColor: showDiamonds ? 'rgba(192, 132, 252, 0.15)' : 'transparent',
              color: showDiamonds ? '#c084fc' : 'var(--text-dim)',
              cursor: 'pointer'
            }}
          >
            Diamonds
          </button>

          {/* Toggle S/R Zones */}
          <button
            onClick={() => setShowSrZones(!showSrZones)}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              fontWeight: 600,
              borderRadius: '2px',
              border: '1px solid',
              borderColor: showSrZones ? '#38bdf8' : 'var(--border-subtle)',
              backgroundColor: showSrZones ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: showSrZones ? '#38bdf8' : 'var(--text-dim)',
              cursor: 'pointer'
            }}
          >
            MSNR / Zones
          </button>

          {/* Toggle BUY / SELL Labels */}
          <button
            onClick={() => setShowBuySellBadges(!showBuySellBadges)}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              fontWeight: 700,
              borderRadius: '2px',
              border: '1px solid',
              borderColor: showBuySellBadges ? 'var(--color-buy)' : 'var(--border-subtle)',
              backgroundColor: showBuySellBadges ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
              color: showBuySellBadges ? 'var(--color-buy)' : 'var(--text-dim)',
              cursor: 'pointer'
            }}
          >
            BUY / SELL Tags
          </button>
        </div>

        {/* Right Info: KSI Score & KCX Trap Warning */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {craziiData?.ksi && (
            <div style={{ fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: 'var(--text-dim)' }}>KSI Big Boys Flow:</span>
              <span className="mono" style={{ color: craziiData.ksi.score >= 50 ? 'var(--color-buy)' : 'var(--color-sell)', fontWeight: 700 }}>
                {craziiData.ksi.score}%
              </span>
            </div>
          )}

          {craziiData?.kcx?.is_trap && (
            <span
              className="badge"
              style={{
                background: 'rgba(255, 51, 102, 0.2)',
                color: 'var(--color-sell)',
                border: '1px solid var(--color-sell-border)'
              }}
            >
              ⚠ KCX TRAP
            </span>
          )}

          <button
            onClick={() => {
              setZoom(1);
              setPanOffset(0);
            }}
            className="btn btn-subtle"
            style={{ padding: '2px 6px', fontSize: '10px' }}
            title="Reset chart scale"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main HTML5 Canvas */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : 'crosshair' }}>
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
}
