/**
 * CRAZII Tactical Trading Chart Engine (crazii.com Institutional Framework)
 * 100% Native High-Performance HTML5 Canvas Trading Chart
 * ZERO TradingView Dependencies • Zero External Watermarks
 * 
 * Features:
 * - OP (Opening Price) Master Bias Filter Line & Distance Gauge
 * - MLP (Mid-Level Price) Mean-Reversion Bounce Equilibrium Zone
 * - CCRY / CCYR Algorithmic Momentum Candle Coloring (Cyan, Magenta, Yellow, Slate)
 * - KSI (K-Sentiment Indicator) Institutional Big Boys Flow Overlay
 * - KCX (K-Cyclical) Retail Extreme & Trap Warning System
 * - DML Diamond Trigger Signal Placements (◆ BUY / ◆ SELL) with Entry/SL/TP
 * - SMC Order Blocks & Fair Value Gaps
 * - Dynamic Price & Time Scales, Interactive Crosshairs, Panning, and Zooming
 */

class CraziiCanvasChart {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`CraziiCanvasChart: Canvas #${canvasId} not found`);
            return;
        }

        this.ctx = this.canvas.getContext("2d");
        this.options = Object.assign({
            showVolume: true,
            showOpLine: true,
            showMlpLine: true,
            showEmas: true,
            showSmc: true,
            showDiamonds: true,
            ccryMode: true,
            isMini: false,
            onCrosshairMove: null
        }, options);

        // Data buffers
        this.candles = [];
        this.craziiData = null;
        this.analysisData = null;

        // Viewport & Scale metrics
        this.candleWidth = this.options.isMini ? 6 : 9;
        this.candleSpacing = this.options.isMini ? 2 : 3;
        this.scrollOffset = 0; // 0 = pinned to latest candle
        this.rightMargin = this.options.isMini ? 55 : 75;
        this.bottomMargin = this.options.isMini ? 20 : 26;
        this.topMargin = this.options.isMini ? 10 : 25;

        // Interaction state
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartOffset = 0;
        this.mousePos = { x: -1, y: -1, active: false };
        this.hoveredCandle = null;

        // Theme colors
        this.theme = {
            bg: "#0a0c10",
            grid: "rgba(255, 255, 255, 0.04)",
            text: "#94a3b8",
            textDim: "#475569",
            border: "#1e2433",
            opLine: "#00e5ff",      // Cyan for OP
            mlpLine: "#d946ef",     // Magenta/Purple for MLP
            bullCandle: "#00e676",  // Standard Bull Green
            bearCandle: "#ff3366",  // Standard Bear Red
            ccryCyan: "#00e5ff",    // Institutional Bull
            ccryMagenta: "#ff007f", // Institutional Bear
            ccryYellow: "#ffea00",  // Squeeze / Wick Rejection
            ccryGray: "#64748b",    // Consolidation / Noise
            diamondBuy: "#00e5ff",
            diamondSell: "#ff007f",
            crosshair: "rgba(148, 163, 184, 0.4)",
            activePricePill: "#f59e0b"
        };

        this.initEvents();
        this.resize();
    }

    initEvents() {
        const c = this.canvas;

        // Window resize
        window.addEventListener("resize", () => this.resize());

        // Mouse events
        c.addEventListener("mousedown", (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartOffset = this.scrollOffset;
            c.style.cursor = "grabbing";
        });

        window.addEventListener("mouseup", () => {
            if (this.isDragging) {
                this.isDragging = false;
                c.style.cursor = "crosshair";
            }
        });

        c.addEventListener("mousemove", (e) => {
            const rect = c.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (this.isDragging) {
                const deltaX = e.clientX - this.dragStartX;
                const candleStep = this.candleWidth + this.candleSpacing;
                const offsetShift = Math.round(deltaX / candleStep);
                this.scrollOffset = Math.max(0, this.dragStartOffset - offsetShift);
                this.requestRender();
            } else {
                this.mousePos = { x: mouseX, y: mouseY, active: true };
                this.updateHoveredCandle(mouseX, mouseY);
                this.requestRender();
            }
        });

        c.addEventListener("mouseleave", () => {
            this.mousePos.active = false;
            this.hoveredCandle = null;
            if (this.options.onCrosshairMove) {
                this.options.onCrosshairMove(null);
            }
            this.requestRender();
        });

        // Wheel zoom
        c.addEventListener("wheel", (e) => {
            e.preventDefault();
            const zoomIn = e.deltaY < 0;
            const zoomFactor = zoomIn ? 1.15 : 0.87;
            this.candleWidth = Math.min(45, Math.max(2.5, this.candleWidth * zoomFactor));
            this.candleSpacing = Math.max(1, Math.round(this.candleWidth * 0.3));
            this.requestRender();
        }, { passive: false });

        // Touch events (Mobile / iPhone)
        let touchStartX = 0;
        let initialPinchDist = null;

        c.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                touchStartX = e.touches[0].clientX;
                this.dragStartOffset = this.scrollOffset;
            } else if (e.touches.length === 2) {
                initialPinchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });

        c.addEventListener("touchmove", (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                const deltaX = e.touches[0].clientX - touchStartX;
                const candleStep = this.candleWidth + this.candleSpacing;
                this.scrollOffset = Math.max(0, this.dragStartOffset - Math.round(deltaX / candleStep));
                this.requestRender();
            } else if (e.touches.length === 2 && initialPinchDist) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const factor = dist / initialPinchDist;
                if (Math.abs(factor - 1.0) > 0.05) {
                    this.candleWidth = Math.min(45, Math.max(2.5, this.candleWidth * (factor > 1 ? 1.05 : 0.95)));
                    this.candleSpacing = Math.max(1, Math.round(this.candleWidth * 0.3));
                    initialPinchDist = dist;
                    this.requestRender();
                }
            }
        }, { passive: true });

        c.addEventListener("touchend", () => {
            this.isDragging = false;
            initialPinchDist = null;
        }, { passive: true });
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width;
        this.height = rect.height || 480;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(dpr, dpr);
        this.requestRender();
    }

    setData(candles, craziiData = null, analysisData = null) {
        this.candles = candles || [];
        this.craziiData = craziiData;
        this.analysisData = analysisData;
        this.requestRender();
    }

    setOption(key, value) {
        this.options[key] = value;
        this.requestRender();
    }

    zoom(delta) {
        const factor = delta > 0 ? 1.25 : 0.8;
        this.candleWidth = Math.min(45, Math.max(2.5, this.candleWidth * factor));
        this.candleSpacing = Math.max(1, Math.round(this.candleWidth * 0.3));
        this.requestRender();
    }

    resetView() {
        this.candleWidth = this.options.isMini ? 6 : 9;
        this.candleSpacing = this.options.isMini ? 2 : 3;
        this.scrollOffset = 0;
        this.requestRender();
    }

    requestRender() {
        if (!this.renderPending) {
            this.renderPending = true;
            requestAnimationFrame(() => {
                this.renderPending = false;
                this.draw();
            });
        }
    }

    updateHoveredCandle(mouseX, mouseY) {
        if (!this.candles.length) return;
        const plotWidth = this.width - this.rightMargin;
        const plotHeight = this.height - this.bottomMargin;

        if (mouseX < 0 || mouseX > plotWidth || mouseY < 0 || mouseY > plotHeight) {
            this.hoveredCandle = null;
            if (this.options.onCrosshairMove) this.options.onCrosshairMove(null);
            return;
        }

        const step = this.candleWidth + this.candleSpacing;
        const totalVisible = Math.floor(plotWidth / step);
        const endIndex = Math.max(0, this.candles.length - 1 - this.scrollOffset);
        const startIndex = Math.max(0, endIndex - totalVisible + 1);

        const xFromRight = plotWidth - mouseX;
        const candleIndexFromRight = Math.floor(xFromRight / step);
        const actualIndex = endIndex - candleIndexFromRight;

        if (actualIndex >= 0 && actualIndex < this.candles.length) {
            this.hoveredCandle = this.candles[actualIndex];
            if (this.options.onCrosshairMove) {
                this.options.onCrosshairMove(this.hoveredCandle);
            }
        } else {
            this.hoveredCandle = null;
            if (this.options.onCrosshairMove) this.options.onCrosshairMove(null);
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        if (!w || !h) return;

        // Clear background
        ctx.fillStyle = this.theme.bg;
        ctx.fillRect(0, 0, w, h);

        if (!this.candles.length) {
            ctx.fillStyle = this.theme.textDim;
            ctx.font = "14px JetBrains Mono, monospace";
            ctx.textAlign = "center";
            ctx.fillText("SYNCING REAL MARKET DATA...", w / 2, h / 2);
            return;
        }

        const plotWidth = w - this.rightMargin;
        const plotHeight = h - this.bottomMargin;
        const step = this.candleWidth + this.candleSpacing;
        const totalVisible = Math.min(this.candles.length, Math.floor(plotWidth / step));

        const endIndex = Math.max(0, this.candles.length - 1 - this.scrollOffset);
        const startIndex = Math.max(0, endIndex - totalVisible + 1);
        const visibleCandles = this.candles.slice(startIndex, endIndex + 1);

        if (!visibleCandles.length) return;

        // Calculate visible price range
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        let maxVolume = 0;

        for (const c of visibleCandles) {
            if (c.low < minPrice) minPrice = c.low;
            if (c.high > maxPrice) maxPrice = c.high;
            const vol = c.volume || Math.abs(c.close - c.open) * 1000;
            if (vol > maxVolume) maxVolume = vol;
        }

        // Include OP and MLP lines in visible price scaling if enabled
        const opVal = this.craziiData?.op?.price;
        const mlpVal = this.craziiData?.mlp?.price;
        if (this.options.showOpLine && opVal && opVal > 0) {
            minPrice = Math.min(minPrice, opVal);
            maxPrice = Math.max(maxPrice, opVal);
        }
        if (this.options.showMlpLine && mlpVal && mlpVal > 0) {
            minPrice = Math.min(minPrice, mlpVal);
            maxPrice = Math.max(maxPrice, mlpVal);
        }

        // Padding (5% top & bottom)
        const pricePadding = (maxPrice - minPrice) * 0.06 || 1.0;
        minPrice -= pricePadding;
        maxPrice += pricePadding;
        const priceRange = maxPrice - minPrice;

        const getY = (val) => {
            return this.topMargin + (1 - (val - minPrice) / priceRange) * (plotHeight - this.topMargin);
        };

        const getX = (idx) => {
            // idx is index inside visibleCandles (0 to visibleCandles.length - 1)
            const candleRight = plotWidth - (visibleCandles.length - 1 - idx) * step;
            return candleRight - (step / 2);
        };

        // 1. Draw Grid Lines
        this.drawGrid(ctx, plotWidth, plotHeight, minPrice, maxPrice, getY);

        // 2. Draw Volume Bars (Bottom 18% of chart)
        if (this.options.showVolume && maxVolume > 0) {
            const volHeight = plotHeight * 0.18;
            for (let i = 0; i < visibleCandles.length; i++) {
                const c = visibleCandles[i];
                const x = getX(i);
                const vol = c.volume || Math.abs(c.close - c.open) * 1000;
                const barH = (vol / maxVolume) * volHeight;
                const isBull = c.close >= c.open;
                
                ctx.fillStyle = isBull ? "rgba(0, 230, 118, 0.22)" : "rgba(255, 51, 102, 0.22)";
                ctx.fillRect(x - this.candleWidth / 2, plotHeight - barH, this.candleWidth, barH);
            }
        }

        // 3. Draw SMC Order Blocks & Structure Zones
        if (this.options.showSmc && this.analysisData?.market_structure) {
            this.drawSmcZones(ctx, plotWidth, getY);
        }

        // 4. Draw EMAs
        if (this.options.showEmas && this.analysisData?.indicators?.ema_series) {
            this.drawEmaLines(ctx, visibleCandles, startIndex, getX, getY);
        }

        // 5. Draw OP (Opening Price) Line
        if (this.options.showOpLine && opVal && opVal > 0) {
            const opY = getY(opVal);
            if (opY >= this.topMargin && opY <= plotHeight) {
                ctx.save();
                ctx.strokeStyle = this.theme.opLine;
                ctx.lineWidth = 1.8;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(0, opY);
                ctx.lineTo(plotWidth, opY);
                ctx.stroke();

                // OP Axis Badge
                this.drawAxisPill(ctx, plotWidth, opY, `OP: ${opVal.toFixed(2)}`, this.theme.opLine, "#000");
                ctx.restore();
            }
        }

        // 6. Draw MLP (Mid-Level Price) Line
        if (this.options.showMlpLine && mlpVal && mlpVal > 0) {
            const mlpY = getY(mlpVal);
            if (mlpY >= this.topMargin && mlpY <= plotHeight) {
                ctx.save();
                ctx.strokeStyle = this.theme.mlpLine;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(0, mlpY);
                ctx.lineTo(plotWidth, mlpY);
                ctx.stroke();

                // MLP Axis Badge
                this.drawAxisPill(ctx, plotWidth, mlpY, `MLP: ${mlpVal.toFixed(2)}`, this.theme.mlpLine, "#fff");
                ctx.restore();
            }
        }

        // 7. Draw Active Signal Lines (Entry, SL, TP)
        const sig = this.analysisData?.signal;
        if (sig && sig.status === "ACTIVE_SETUP") {
            this.drawSignalLines(ctx, plotWidth, sig, getY);
        }

        // 8. Draw Candlesticks & CCRY Colors
        for (let i = 0; i < visibleCandles.length; i++) {
            const c = visibleCandles[i];
            const x = getX(i);
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            const isBull = c.close >= c.open;
            let candleColor = isBull ? this.theme.bullCandle : this.theme.bearCandle;

            // Apply CCRY Algorithmic Color
            if (this.options.ccryMode) {
                candleColor = this.getCandleCcryColor(c);
            }

            // Draw wick
            ctx.strokeStyle = candleColor;
            ctx.lineWidth = Math.max(1, Math.min(2.5, this.candleWidth * 0.18));
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.stroke();

            // Draw body
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
            const bodyLeft = x - this.candleWidth / 2;

            ctx.fillStyle = candleColor;
            ctx.fillRect(bodyLeft, bodyTop, this.candleWidth, bodyHeight);
        }

        // 9. Draw Diamond Trigger Signal Markers (◆ BUY / ◆ SELL)
        if (this.options.showDiamonds) {
            this.drawDiamondMarkers(ctx, visibleCandles, getX, getY);
        }

        // 10. Draw Current Live Price Line & Glow Pill
        const latestCandle = this.candles[this.candles.length - 1];
        if (latestCandle) {
            const curY = getY(latestCandle.close);
            ctx.save();
            ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(0, curY);
            ctx.lineTo(plotWidth, curY);
            ctx.stroke();

            this.drawAxisPill(ctx, plotWidth, curY, latestCandle.close.toFixed(2), "#f59e0b", "#000");
            ctx.restore();
        }

        // 11. Draw Price Axis (Right) & Time Axis (Bottom)
        this.drawAxes(ctx, w, h, plotWidth, plotHeight, minPrice, maxPrice, visibleCandles, getX, getY);

        // 12. Draw Interactive Crosshair & Tooltips
        if (this.mousePos.active && !this.options.isMini) {
            this.drawCrosshair(ctx, plotWidth, plotHeight, minPrice, priceRange);
        }
    }

    getCandleCcryColor(candle) {
        if (candle.ccry_color) return candle.ccry_color;

        // Fallback client-side CCRY logic
        const opVal = this.craziiData?.op?.price || candle.open;
        const isBull = candle.close >= candle.open;
        const range = Math.max(candle.high - candle.low, 0.0001);
        const body = Math.abs(candle.close - candle.open);
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;

        if (upperWick / range > 0.55 || lowerWick / range > 0.55) {
            return this.theme.ccryYellow; // Wick Rejection
        } else if (isBull && candle.close >= opVal) {
            return this.theme.ccryCyan;   // Institutional Bull
        } else if (!isBull && candle.close < opVal) {
            return this.theme.ccryMagenta; // Institutional Bear
        } else if (body / range < 0.25) {
            return this.theme.ccryGray;   // Consolidation Chop
        }
        return isBull ? this.theme.bullCandle : this.theme.bearCandle;
    }

    drawGrid(ctx, plotWidth, plotHeight, minPrice, maxPrice, getY) {
        ctx.strokeStyle = this.theme.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        // Horizontal price grid lines
        const numPriceSteps = this.options.isMini ? 4 : 7;
        const priceStep = (maxPrice - minPrice) / numPriceSteps;
        for (let i = 0; i <= numPriceSteps; i++) {
            const p = minPrice + i * priceStep;
            const y = getY(p);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(plotWidth, y);
            ctx.stroke();
        }

        // Vertical time grid lines
        const numTimeSteps = this.options.isMini ? 4 : 8;
        const timeStepX = plotWidth / numTimeSteps;
        for (let i = 1; i < numTimeSteps; i++) {
            const x = i * timeStepX;
            ctx.beginPath();
            ctx.moveTo(x, this.topMargin);
            ctx.lineTo(x, plotHeight);
            ctx.stroke();
        }
    }

    drawAxes(ctx, w, h, plotWidth, plotHeight, minPrice, maxPrice, visibleCandles, getX, getY) {
        ctx.fillStyle = this.theme.textDim;
        ctx.font = "11px JetBrains Mono, monospace";

        // Right Price Axis labels
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const numSteps = this.options.isMini ? 4 : 7;
        const step = (maxPrice - minPrice) / numSteps;
        for (let i = 0; i <= numSteps; i++) {
            const p = minPrice + i * step;
            const y = getY(p);
            ctx.fillText(p.toFixed(2), plotWidth + 8, y);
        }

        // Bottom Time Axis labels
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const timeInterval = Math.max(1, Math.floor(visibleCandles.length / (this.options.isMini ? 3 : 6)));
        for (let i = 0; i < visibleCandles.length; i += timeInterval) {
            const c = visibleCandles[i];
            const x = getX(i);
            const date = new Date(c.time * 1000);
            const timeStr = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
            ctx.fillText(timeStr, x, plotHeight + 6);
        }

        // Axes Borders
        ctx.strokeStyle = this.theme.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotWidth, 0);
        ctx.lineTo(plotWidth, h);
        ctx.moveTo(0, plotHeight);
        ctx.lineTo(w, plotHeight);
        ctx.stroke();
    }

    drawAxisPill(ctx, plotWidth, y, text, bgColor, textColor) {
        ctx.save();
        ctx.font = "bold 10px JetBrains Mono, monospace";
        const textWidth = ctx.measureText(text).width;
        const pillW = textWidth + 12;
        const pillH = 18;

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(plotWidth + 3, y - pillH / 2, pillW, pillH, 4);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, plotWidth + 9, y);
        ctx.restore();
    }

    drawEmaLines(ctx, visibleCandles, startIndex, getX, getY) {
        const emaData = this.analysisData?.indicators?.ema_series;
        if (!emaData) return;

        const emas = [
            { key: "ema_fast", color: "#d4af37", width: 1.2 },    // EMA 9 Gold
            { key: "ema_medium", color: "#38bdf8", width: 1.2 },  // EMA 21 Cyan
            { key: "ema_slow", color: "#a855f7", width: 1.2 },    // EMA 50 Purple
            { key: "ema_baseline", color: "#ff3366", width: 1.8 } // EMA 200 Red
        ];

        for (const ema of emas) {
            const series = emaData[ema.key];
            if (!series || !series.length) continue;

            // Map time to value
            const timeMap = new Map();
            series.forEach(item => timeMap.set(item.time, item.value));

            ctx.save();
            ctx.strokeStyle = ema.color;
            ctx.lineWidth = ema.width;
            ctx.setLineDash([]);
            ctx.beginPath();

            let started = false;
            for (let i = 0; i < visibleCandles.length; i++) {
                const c = visibleCandles[i];
                const val = timeMap.get(c.time);
                if (val !== undefined) {
                    const x = getX(i);
                    const y = getY(val);
                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            }
            if (started) ctx.stroke();
            ctx.restore();
        }
    }

    drawSmcZones(ctx, plotWidth, getY) {
        const smc = this.analysisData.market_structure;
        if (!smc) return;

        // Order Blocks
        const obs = smc.order_blocks || [];
        for (const ob of obs.slice(0, 3)) {
            const topY = getY(ob.high);
            const botY = getY(ob.low);
            const isBull = ob.type === "BULLISH";

            ctx.save();
            ctx.fillStyle = isBull ? "rgba(0, 230, 118, 0.08)" : "rgba(255, 51, 102, 0.08)";
            ctx.strokeStyle = isBull ? "rgba(0, 230, 118, 0.45)" : "rgba(255, 51, 102, 0.45)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 2]);

            const h = Math.abs(botY - topY);
            ctx.fillRect(0, Math.min(topY, botY), plotWidth, h);
            ctx.strokeRect(0, Math.min(topY, botY), plotWidth, h);

            // Badge text
            ctx.fillStyle = isBull ? "#00e676" : "#ff3366";
            ctx.font = "bold 9px JetBrains Mono, monospace";
            ctx.fillText(`OB ${ob.type}`, 8, Math.min(topY, botY) + 12);
            ctx.restore();
        }
    }

    drawSignalLines(ctx, plotWidth, sig, getY) {
        const levels = [
            { price: sig.entry_price, label: `ENTRY (${sig.direction})`, color: "#d4af37", dash: [6, 4] },
            { price: sig.sl_price, label: "STOP LOSS", color: "#ff3366", dash: [] },
            { price: sig.tp1_price, label: "TP 1", color: "#00e676", dash: [3, 3] },
            { price: sig.tp2_price, label: "TP 2", color: "#00e676", dash: [] }
        ];

        for (const lvl of levels) {
            if (!lvl.price) continue;
            const y = getY(lvl.price);
            ctx.save();
            ctx.strokeStyle = lvl.color;
            ctx.lineWidth = 1.6;
            ctx.setLineDash(lvl.dash);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(plotWidth, y);
            ctx.stroke();

            this.drawAxisPill(ctx, plotWidth, y, lvl.label, lvl.color, "#000");
            ctx.restore();
        }
    }

    drawDiamondMarkers(ctx, visibleCandles, getX, getY) {
        const diamond = this.craziiData?.diamond_trigger?.marker;
        if (!diamond || !visibleCandles.length) return;

        // Place marker on latest candle or trigger bar
        const latestIdx = visibleCandles.length - 1;
        const c = visibleCandles[latestIdx];
        const x = getX(latestIdx);
        const isBuy = diamond.type === "BUY";
        const y = isBuy ? getY(c.low) + 24 : getY(c.high) - 24;

        ctx.save();
        ctx.fillStyle = isBuy ? this.theme.diamondBuy : this.theme.diamondSell;
        ctx.font = "bold 11px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw diamond icon ◆
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fillText(diamond.label, x, y);
        ctx.restore();
    }

    drawCrosshair(ctx, plotWidth, plotHeight, minPrice, priceRange) {
        const mx = this.mousePos.x;
        const my = this.mousePos.y;

        ctx.save();
        ctx.strokeStyle = this.theme.crosshair;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(mx, this.topMargin);
        ctx.lineTo(mx, plotHeight);
        ctx.stroke();

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(0, my);
        ctx.lineTo(plotWidth, my);
        ctx.stroke();

        // Hovered price on right axis
        const hoverPrice = minPrice + (1 - (my - this.topMargin) / (plotHeight - this.topMargin)) * priceRange;
        this.drawAxisPill(ctx, plotWidth, my, hoverPrice.toFixed(2), "#38bdf8", "#000");

        ctx.restore();
    }
}

