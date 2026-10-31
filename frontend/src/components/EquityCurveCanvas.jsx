import React, { useRef, useEffect } from 'react';

export default function EquityCurveCanvas({ equityPoints = [], initialBalance = 10000, height = 220 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#090e1a';
    ctx.fillRect(0, 0, width, canvasHeight);

    if (!equityPoints || equityPoints.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Run backtest to plot verified walk-forward equity curve', width / 2, canvasHeight / 2);
      ctx.restore();
      return;
    }

    const padding = { top: 20, right: 60, bottom: 25, left: 15 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = canvasHeight - padding.top - padding.bottom;

    const values = equityPoints.map((p) => (typeof p === 'number' ? p : p.equity || p.balance || initialBalance));
    let minVal = Math.min(initialBalance * 0.95, ...values);
    let maxVal = Math.max(initialBalance * 1.05, ...values);
    const range = maxVal - minVal || 1;

    const getX = (idx) => padding.left + (idx / (values.length - 1)) * plotWidth;
    const getY = (val) => padding.top + plotHeight - ((val - minVal) / range) * plotHeight;

    // Baseline (Initial Balance)
    const baseY = getY(initialBalance);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, baseY);
    ctx.lineTo(padding.left + plotWidth, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gradient fill under equity line
    const lastVal = values[values.length - 1];
    const isProfitable = lastVal >= initialBalance;
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
    if (isProfitable) {
      grad.addColorStop(0, 'rgba(0, 230, 118, 0.25)');
      grad.addColorStop(1, 'rgba(0, 230, 118, 0.0)');
    } else {
      grad.addColorStop(0, 'rgba(255, 51, 102, 0.25)');
      grad.addColorStop(1, 'rgba(255, 51, 102, 0.0)');
    }

    // Fill polygon
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(values[0]));
    for (let i = 1; i < values.length; i++) {
      ctx.lineTo(getX(i), getY(values[i]));
    }
    ctx.lineTo(getX(values.length - 1), padding.top + plotHeight);
    ctx.lineTo(getX(0), padding.top + plotHeight);
    ctx.closePath();
    ctx.fill();

    // Stroke line
    ctx.strokeStyle = isProfitable ? '#00e676' : '#ff3366';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(values[0]));
    for (let i = 1; i < values.length; i++) {
      ctx.lineTo(getX(i), getY(values[i]));
    }
    ctx.stroke();

    // Y Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$${maxVal.toFixed(0)}`, width - padding.right + 8, padding.top + 10);
    ctx.fillText(`$${initialBalance.toFixed(0)}`, width - padding.right + 8, baseY + 3);
    ctx.fillText(`$${minVal.toFixed(0)}`, width - padding.right + 8, padding.top + plotHeight);

    ctx.restore();
  }, [equityPoints, initialBalance]);

  return (
    <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
