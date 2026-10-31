/**
NEXORA FX — Institutional Multi-Market Terminal Controller
Full-stack trading terminal supporting Forex, Metals, Crypto, Indices, Stocks, Commodities, and Yields.
Integrated with TradingView Lightweight Charts, SMC/MSNR Engine, Scanner, Backtester, Journal, and Risk Calculator.
*/

class NexoraApp {
    constructor() {
        this.currentSymbol = "XAUUSD";
        this.currentTimeframe = "M15";
        this.activePage = "dashboard";
        this.activeProvider = "auto";
        this.refreshIntervalSec = 15;
        this.refreshCountdown = 15;
        this.timerId = null;
        this.audioEnabled = true;
        this.lastSignalDirection = null;

        // CRAZII Canvas Chart instances
        this.mainCraziiChart = null;
        this.miniCraziiChart = null;
        this.mainChart = null;
        this.miniChart = null;
        this.candleSeries = null;
        this.miniCandleSeries = null;
        this.volumeSeries = null;
        this.emaSeriesMap = {};
        this.activePriceLines = [];

        // Cached data
        this.latestCandles = [];
        this.latestAnalysis = null;
        this.watchlist = [];
        this.marketsData = {};
        this.providersStatus = [];

        this.init();
    }

    async init() {
        window.scrollTo(0, 0);
        const dashView = document.getElementById("view-dashboard");
        if (dashView) dashView.scrollTop = 0;

        this.bindEvents();
        this.bindCraziiControls();
        this.initXenoGlobe();
        this.startUtcClock();
        this.startSessionClock();
        this.detectLanIp();
        await this.loadWatchlist();
        await this.refreshAllData();
        await this.loadMarketsCatalogue();
        this.startAutoRefreshLoop();
        this.renderSessionTimes();
    }

    // =========================================================
    // EVENT BINDINGS & NAVIGATION
    // =========================================================
    bindEvents() {
        // Desktop Sidebar Nav Buttons
        document.querySelectorAll(".nav-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetPage = btn.getAttribute("data-page");
                this.switchPage(targetPage);
            });
        });

        // Xeno Floating Capsule Navigation Links
        document.querySelectorAll(".xeno-pill-link").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetPage = btn.getAttribute("data-page");
                this.switchPage(targetPage);
            });
        });

        // Mobile & Xeno Drawer Toggles
        const mobileBtn = document.getElementById("mobile-menu-btn");
        const drawerToggle = document.getElementById("xeno-drawer-toggle");
        const xenoBrand = document.getElementById("xeno-nav-brand");
        const collapseBtn = document.getElementById("btn-collapse-sidebar");
        const sidebar = document.getElementById("sidebar");
        const backdrop = document.getElementById("sidebar-backdrop");

        const updateBackdrop = () => {
            if (!backdrop || !sidebar) return;
            const isOpen = !sidebar.classList.contains("collapsed") || sidebar.classList.contains("mobile-open");
            if (isOpen) {
                backdrop.classList.add("active");
            } else {
                backdrop.classList.remove("active");
            }
        };

        const toggleSidebar = () => {
            if (!sidebar) return;
            if (window.innerWidth <= 992) {
                sidebar.classList.toggle("mobile-open");
            } else {
                sidebar.classList.toggle("collapsed");
                setTimeout(() => {
                    const c = document.getElementById("dashboard-mini-chart");
                    if (this.miniChart && c) this.miniChart.applyOptions({ width: c.clientWidth });
                }, 320);
            }
            updateBackdrop();
        };

        const closeSidebar = () => {
            if (!sidebar) return;
            sidebar.classList.add("collapsed");
            sidebar.classList.remove("mobile-open");
            if (backdrop) backdrop.classList.remove("active");
            setTimeout(() => {
                const c = document.getElementById("dashboard-mini-chart");
                if (this.miniChart && c) this.miniChart.applyOptions({ width: c.clientWidth });
            }, 320);
        };

        if (mobileBtn && sidebar) mobileBtn.addEventListener("click", toggleSidebar);
        if (drawerToggle && sidebar) drawerToggle.addEventListener("click", toggleSidebar);
        if (xenoBrand && sidebar) xenoBrand.addEventListener("click", toggleSidebar);
        if (collapseBtn && sidebar) collapseBtn.addEventListener("click", closeSidebar);
        if (backdrop) backdrop.addEventListener("click", closeSidebar);

        // Global Active Symbol Dropdown in Header
        const symSelect = document.getElementById("header-symbol-select");
        if (symSelect) {
            symSelect.addEventListener("change", async (e) => {
                this.selectSymbol(e.target.value);
            });
        }

        // Global Provider Dropdown in Header
        const provSelect = document.getElementById("header-provider-select");
        if (provSelect) {
            provSelect.addEventListener("change", async (e) => {
                this.activeProvider = e.target.value;
                this.showToast(`Provider routed to: ${this.activeProvider.toUpperCase()}`, "info");
                await this.refreshAllData(true);
            });
        }

        // Global Timeframe Selector
        document.querySelectorAll(".tf-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.currentTimeframe = btn.getAttribute("data-tf");
                this.showToast(`Timeframe switched to ${this.currentTimeframe}`, "info");
                await this.refreshAllData(true);
            });
        });

        // Manual Refresh Button
        const refreshBtn = document.getElementById("refresh-btn");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", async () => {
                this.refreshCountdown = this.refreshIntervalSec;
                await this.refreshAllData(true);
                this.showToast("Market data refreshed", "info");
            });
        }

        // Audio Alert Toggle
        const soundBtn = document.getElementById("sound-toggle-btn");
        const soundIcon = document.getElementById("sound-icon");
        if (soundBtn) {
            soundBtn.addEventListener("click", () => {
                this.audioEnabled = !this.audioEnabled;
                soundIcon.textContent = this.audioEnabled ? "🔊" : "🔇";
                this.showToast(`Audio alerts ${this.audioEnabled ? "Enabled" : "Muted"}`, "info");
                if (this.audioEnabled) this.playChime(660, 0.1);
            });
        }

        // Wi-Fi Guide Modal Triggers
        const btnWifiGuide = document.getElementById("btn-open-wifi-guide");
        const wifiModal = document.getElementById("wifi-guide-modal");
        const btnCloseWifi = document.getElementById("btn-close-wifi-modal");
        const btnAckWifi = document.getElementById("btn-ack-wifi-modal");
        if (btnWifiGuide && wifiModal) {
            btnWifiGuide.addEventListener("click", () => wifiModal.style.display = "flex");
        }
        if (btnCloseWifi && wifiModal) {
            btnCloseWifi.addEventListener("click", () => wifiModal.style.display = "none");
        }
        if (btnAckWifi && wifiModal) {
            btnAckWifi.addEventListener("click", () => wifiModal.style.display = "none");
        }

        // Dashboard button to open full chart
        const dashOpenChart = document.getElementById("dash-btn-open-fullchart");
        if (dashOpenChart) {
            dashOpenChart.addEventListener("click", () => this.switchPage("chart"));
        }

        // Scanner Filter buttons
        const btnRunScan = document.getElementById("btn-run-scan");
        if (btnRunScan) {
            btnRunScan.addEventListener("click", () => this.executeMarketScan());
        }

        // Category filter tabs on All Markets view
        document.querySelectorAll("#market-category-filters .filter-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll("#market-category-filters .filter-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                this.filterMarketsCategory(tab.getAttribute("data-cat"));
            });
        });

        // Overlay toggles on chart
        ["toggle-ema-9", "toggle-ema-21", "toggle-ema-50", "toggle-ema-200", "toggle-smc-levels"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("change", () => this.updateChartOverlays());
            }
        });

        // Risk Calculator form
        const btnCalc = document.getElementById("btn-calculate-risk");
        if (btnCalc) {
            btnCalc.addEventListener("click", () => this.computeRiskPosition());
        }

        // Backtester button
        const btnBt = document.getElementById("btn-run-backtest");
        if (btnBt) {
            btnBt.addEventListener("click", () => this.runBacktest());
        }

        // Journal Modal buttons
        const btnOpenJournal = document.getElementById("btn-open-journal-modal");
        const journalModal = document.getElementById("journal-modal");
        const btnCloseJournal = document.getElementById("btn-close-journal-modal");
        const btnCancelJournal = document.getElementById("btn-cancel-journal");
        const btnSaveJournal = document.getElementById("btn-save-journal-entry");

        if (btnOpenJournal && journalModal) {
            btnOpenJournal.addEventListener("click", () => {
                document.getElementById("j-symbol").value = this.currentSymbol;
                if (this.latestAnalysis && this.latestAnalysis.latest_price) {
                    document.getElementById("j-entry").value = this.latestAnalysis.latest_price;
                }
                journalModal.style.display = "flex";
            });
        }
        if (btnCloseJournal && journalModal) {
            btnCloseJournal.addEventListener("click", () => journalModal.style.display = "none");
        }
        if (btnCancelJournal && journalModal) {
            btnCancelJournal.addEventListener("click", () => journalModal.style.display = "none");
        }
        if (btnSaveJournal) {
            btnSaveJournal.addEventListener("click", (e) => {
                e.preventDefault();
                this.saveJournalEntry();
            });
        }

        // Data Sources re-verify
        const btnRefreshProv = document.getElementById("btn-refresh-providers-status");
        if (btnRefreshProv) {
            btnRefreshProv.addEventListener("click", () => this.loadProvidersStatus());
        }

        // Settings save
        const btnSaveSettings = document.getElementById("btn-save-settings");
        if (btnSaveSettings) {
            btnSaveSettings.addEventListener("click", () => this.saveSettings());
        }
    }

    switchPage(pageId) {
        this.activePage = pageId;

        // Update Nav buttons & Xeno Capsule Nav Pills
        document.querySelectorAll(".nav-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-page") === pageId);
        });
        document.querySelectorAll(".xeno-pill-link").forEach(pill => {
            pill.classList.toggle("active", pill.getAttribute("data-page") === pageId);
        });

        // Update Page Views
        document.querySelectorAll(".page-view").forEach(view => {
            view.classList.remove("active");
        });
        const targetView = document.getElementById(`view-${pageId}`);
        if (targetView) {
            targetView.classList.add("active");
        }

        if (pageId === "dashboard" && this.miniCraziiChart) {
            setTimeout(() => this.miniCraziiChart.resize(), 60);
        }

        // Update Page Title
        const pageTitles = {
            "dashboard": "Market Dashboard",
            "chart": "CRAZII Tactical Pro Terminal",
            "scanner": "Market Scanner",
            "all-markets": "All Markets Hub",
            "forex": "Forex Currency Pairs",
            "metals": "Precious Metals (Gold & Silver)",
            "crypto": "Cryptocurrency 24/7",
            "indices": "Global Indices",
            "stocks": "Stocks & Equities",
            "commodities": "Commodities & Energy",
            "ema-analysis": "EMA Trend Dynamics",
            "msnr-smc": "Smart Money Concepts & MSNR",
            "mtf": "Multi-Timeframe Confluence",
            "signals": "Live Sniper Signals",
            "backtest": "Historical Backtester",
            "journal": "Trading Journal",
            "risk-calculator": "Risk Calculator",
            "data-sources": "Data Sources & Provider Feeds",
            "settings": "Settings"
        };
        const titleEl = document.getElementById("current-page-title");
        if (titleEl) titleEl.textContent = pageTitles[pageId] || "Terminal";

        // Handle specific page triggers
        if (pageId === "chart") {
            setTimeout(() => this.initOrResizeMainChart(), 50);
        } else if (pageId === "scanner") {
            this.executeMarketScan();
        } else if (pageId === "all-markets" || pageId === "forex" || pageId === "metals" || pageId === "crypto" || pageId === "indices" || pageId === "stocks" || pageId === "commodities") {
            this.renderCategoryView(pageId);
        } else if (pageId === "mtf") {
            this.loadMultiTimeframe();
        } else if (pageId === "journal") {
            this.loadJournalEntries();
        } else if (pageId === "data-sources") {
            this.loadProvidersStatus();
        }

        // Close drawer & backdrop if open
        const sidebar = document.getElementById("sidebar");
        const backdrop = document.getElementById("sidebar-backdrop");
        if (sidebar) {
            sidebar.classList.add("collapsed");
            sidebar.classList.remove("mobile-open");
        }
        if (backdrop) backdrop.classList.remove("active");
    }

    async selectSymbol(symbol) {
        this.currentSymbol = symbol.toUpperCase();
        const symSelect = document.getElementById("header-symbol-select");
        if (symSelect) symSelect.value = this.currentSymbol;

        const sbBadge = document.getElementById("sb-symbol-badge");
        if (sbBadge) sbBadge.textContent = this.currentSymbol;

        this.showToast(`Active symbol set to: ${this.currentSymbol}`, "info");
        await this.refreshAllData(true);
    }

    detectLanIp() {
        const lanEl = document.getElementById("lan-url-display");
        if (lanEl) {
            const host = window.location.hostname || "localhost";
            const port = window.location.port || "8000";
            lanEl.textContent = `http://${host}:${port}`;
        }
    }

    // =========================================================
    // DATA POLLING & REFRESH
    // =========================================================
    startAutoRefreshLoop() {
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(async () => {
            this.refreshCountdown--;
            const timerEl = document.getElementById("refresh-countdown");
            if (timerEl) timerEl.textContent = `${this.refreshCountdown}s`;

            if (this.refreshCountdown <= 0) {
                this.refreshCountdown = this.refreshIntervalSec;
                await this.refreshAllData(false);
            }
        }, 1000);
    }

    async refreshAllData(forced = false) {
        try {
            // 1. Fetch comprehensive analysis & signals
            const analysisUrl = `/api/analysis?symbol=${this.currentSymbol}&timeframe=${this.currentTimeframe}&provider=${this.activeProvider}`;
            const res = await fetch(analysisUrl);
            if (!res.ok) throw new Error(`Analysis error: ${res.statusText}`);
            const data = await res.json();
            this.latestAnalysis = data;

            // 2. Fetch candles for chart
            const candlesUrl = `/api/candles?symbol=${this.currentSymbol}&timeframe=${this.currentTimeframe}&limit=250&provider=${this.activeProvider}`;
            const cRes = await fetch(candlesUrl);
            if (cRes.ok) {
                const cData = await cRes.json();
                this.latestCandles = cData.candles || [];
            }

            // 3. Render all widgets
            this.renderDashboardKpis(data);
            this.renderTelemetryStatus(data);
            this.renderMiniChart();
            this.renderMainChart();
            this.renderEmaAnalysis(data);
            this.renderSmcAnalysis(data);
            this.renderSignalsHero(data);
            this.checkSignalAudioAlert(data.signal);
            this.renderWatchlist();

        } catch (e) {
            console.error("Refresh error:", e);
            const badge = document.getElementById("feed-status-badge");
            if (badge) {
                badge.textContent = "OFFLINE";
                badge.className = "feed-status-badge status-offline";
            }
        }
    }

    // =========================================================
    // KPI & TELEMETRY RENDERING
    // =========================================================
    renderDashboardKpis(data) {
        const symLabel = document.getElementById("dash-symbol-name");
        if (symLabel) symLabel.textContent = `${data.symbol} SPOT PRICE`;

        const priceEl = document.getElementById("dash-price");
        const sbPriceEl = document.getElementById("sb-ticker-price");
        if (data.latest_price !== null && data.latest_price !== undefined) {
            const formatted = data.latest_price.toFixed(data.symbol.includes("JPY") ? 3 : (data.latest_price > 500 ? 2 : 4));
            if (priceEl) priceEl.textContent = formatted;
            if (sbPriceEl) sbPriceEl.textContent = formatted;
        }

        // Daily change calculation
        const changeEl = document.getElementById("dash-price-change");
        const sbChangeEl = document.getElementById("sb-ticker-change");
        if (this.latestCandles.length >= 2) {
            const prev = this.latestCandles[this.latestCandles.length - 2].close;
            const curr = data.latest_price;
            const diff = curr - prev;
            const pct = (diff / prev) * 100.0;
            const sign = diff >= 0 ? "+" : "";
            const cls = diff >= 0 ? "up" : "down";
            const text = `${sign}${diff.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
            if (changeEl) {
                changeEl.textContent = text;
                changeEl.className = `kpi-sub-tag ${cls}`;
            }
            if (sbChangeEl) {
                sbChangeEl.textContent = `${sign}${pct.toFixed(2)}%`;
                sbChangeEl.className = `ticker-change ${cls}`;
            }
        }

        // High, Low, ATR
        const ind = data.indicators ? data.indicators.latest : {};
        if (this.latestCandles.length > 0) {
            const latestBar = this.latestCandles[this.latestCandles.length - 1];
            document.getElementById("dash-high").textContent = latestBar.high.toFixed(2);
            document.getElementById("dash-low").textContent = latestBar.low.toFixed(2);
        }
        if (ind && ind.atr) {
            document.getElementById("dash-atr").textContent = ind.atr.toFixed(2);
        }

        // EMA Trend
        const trendEl = document.getElementById("dash-ema-trend");
        const trendBadge = document.getElementById("dash-ema-badge");
        if (trendEl && data.indicators) {
            trendEl.textContent = data.indicators.trend;
            trendEl.className = `kpi-main-number ${data.indicators.trend.toLowerCase()}`;
            if (trendBadge) trendBadge.textContent = `${data.timeframe} ALIGNMENT`;
            if (ind.ema_fast && ind.ema_medium) {
                document.getElementById("dash-ema-fast").textContent = `${ind.ema_fast.toFixed(2)} / ${ind.ema_medium.toFixed(2)}`;
            }
            if (ind.ema_baseline && data.latest_price) {
                const dist = (data.latest_price - ind.ema_baseline).toFixed(2);
                document.getElementById("dash-ema200-dist").textContent = `${dist >= 0 ? '+' : ''}${dist}`;
            }
        }

        // Market Structure & Equilibrium
        const smc = data.market_structure || {};
        const structEl = document.getElementById("dash-structure-state");
        if (structEl) {
            structEl.textContent = smc.structure_state || "NEUTRAL";
            structEl.className = `kpi-main-number ${(smc.structure_state || "NEUTRAL").toLowerCase()}`;
        }
        if (smc.equilibrium) {
            document.getElementById("dash-eq-mid").textContent = smc.equilibrium.midpoint_50 || "--";
            document.getElementById("dash-eq-zone").textContent = smc.equilibrium.zone || "--";
        }

        // Signal KPI
        const sig = data.signal || {};
        const dirEl = document.getElementById("dash-signal-direction");
        const scoreBadge = document.getElementById("dash-signal-score-badge");
        if (dirEl) {
            dirEl.textContent = sig.direction || "WAIT";
            dirEl.className = `kpi-main-number signal-glow ${(sig.direction || "WAIT").toLowerCase()}`;
        }
        if (scoreBadge) scoreBadge.textContent = `SCORE: ${sig.setup_score || 0}/100`;

        document.getElementById("dash-signal-entry").textContent = sig.entry_price ? sig.entry_price.toFixed(2) : "STANDBY";
        document.getElementById("dash-signal-sl").textContent = sig.sl_price ? sig.sl_price.toFixed(2) : "STANDBY";
        document.getElementById("dash-signal-tp").textContent = sig.tp1_price ? sig.tp1_price.toFixed(2) : "STANDBY";

        // Score bar & reasons
        const scoreFill = document.getElementById("dash-score-fill");
        const scorePill = document.getElementById("dash-score-pill");
        if (scoreFill) scoreFill.style.width = `${sig.setup_score || 0}%`;
        if (scorePill) scorePill.textContent = `Score: ${sig.setup_score || 0} / 100`;

        const reasonsList = document.getElementById("dash-reasons-list");
        if (reasonsList && sig.reasons) {
            reasonsList.innerHTML = sig.reasons.map(r => `<div class="reason-item">✓ ${r}</div>`).join("");
        }

        const invalList = document.getElementById("dash-invalidations-list");
        if (invalList && sig.invalidations) {
            invalList.innerHTML = sig.invalidations.map(inv => `<div class="invalidation-item">⚠ ${inv}</div>`).join("");
        }

        // Update Xeno Left Stage Header Live Quotes
        const xenoSym = document.getElementById("xeno-active-symbol");
        const xenoTf = document.getElementById("xeno-active-tf");
        if (xenoSym) xenoSym.textContent = this.currentSymbol;
        if (xenoTf) xenoTf.textContent = this.currentTimeframe;

        if (this.latestCandles.length > 0) {
            const lastCandle = this.latestCandles[this.latestCandles.length - 1];
            const prevCandle = this.latestCandles.length >= 2 ? this.latestCandles[this.latestCandles.length - 2] : lastCandle;
            const diff = lastCandle.close - prevCandle.close;
            const pct = prevCandle.close ? (diff / prevCandle.close) * 100 : 0;
            const sign = diff >= 0 ? "+" : "";

            const xO = document.getElementById("xeno-o");
            const xH = document.getElementById("xeno-h");
            const xL = document.getElementById("xeno-l");
            const xC = document.getElementById("xeno-c");
            if (xO) xO.textContent = lastCandle.open.toFixed(2);
            if (xH) xH.textContent = lastCandle.high.toFixed(2);
            if (xL) xL.textContent = lastCandle.low.toFixed(2);
            if (xC) {
                xC.textContent = `${lastCandle.close.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
                xC.className = diff >= 0 ? "pos" : "neg";
            }
        }

        // Update Xeno Right Stage Telemetry Gauges
        const scoreVal = sig.setup_score || 92;
        const xenoScore = document.getElementById("xeno-val-score");
        const xenoScoreSvg = document.getElementById("xeno-gauge-score-svg");
        if (xenoScore) xenoScore.textContent = `${scoreVal}%`;
        if (xenoScoreSvg) xenoScoreSvg.setAttribute("stroke-dasharray", `${scoreVal}, 100`);

        const xenoFeed = document.getElementById("xeno-val-feed");
        if (xenoFeed) {
            xenoFeed.textContent = (data.source_status === "LIVE" || !data.source_status) ? "100%" : "95%";
        }
    }

    renderTelemetryStatus(data) {
        const feedBadge = document.getElementById("feed-status-badge");
        const sbProviderTag = document.getElementById("sb-provider-tag");
        const brokerLabel = document.getElementById("broker-name-label");
        const brokerSpread = document.getElementById("broker-spread-tag");

        const statusStr = data.source_status || "LIVE";
        if (feedBadge) {
            feedBadge.textContent = statusStr;
            feedBadge.className = `feed-status-badge status-${statusStr.toLowerCase()}`;
        }

        const provName = data.provider ? data.provider.toUpperCase() : "AUTO";
        if (sbProviderTag) sbProviderTag.textContent = `Provider: ${provName}`;
        if (brokerLabel) brokerLabel.textContent = `${provName} (${data.source || data.symbol})`;
        if (brokerSpread) brokerSpread.textContent = data.delay_info || "0ms Real-Time";

        const lastUp = document.getElementById("sb-last-update");
        if (lastUp && data.last_update) {
            const d = new Date(data.last_update);
            lastUp.textContent = `Updated: ${d.toLocaleTimeString()}`;
        }
    }

    // =========================================================
    // CRAZII CANVAS TRADING CHART ENGINE (Zero TradingView)
    // =========================================================
    bindCraziiControls() {
        // Timeframe selector on CRAZII Terminal
        document.querySelectorAll("#crazii-tf-selector .crazii-tf-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#crazii-tf-selector .crazii-tf-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const tf = btn.getAttribute("data-tf");
                this.currentTimeframe = tf;
                const headerSelect = document.getElementById("header-tf-select");
                if (headerSelect) headerSelect.value = tf;
                this.refreshAllData(true);
            });
        });

        // CCRY Smart Candles Mode Switch
        const btnCcry = document.getElementById("btn-mode-ccry");
        if (btnCcry) {
            btnCcry.addEventListener("click", () => {
                const isActive = btnCcry.classList.toggle("active");
                if (this.mainCraziiChart) {
                    this.mainCraziiChart.setOption("ccryMode", isActive);
                }
                btnCcry.innerHTML = isActive 
                    ? '<i class="fa-solid fa-wand-magic-sparkles"></i> CCRY Smart Colors' 
                    : '<i class="fa-solid fa-chart-column"></i> Classic Candles';
                this.showToast(isActive ? "CRAZII CCRY Mode: Active" : "Classic Candle Mode: Active", "info");
            });
        }

        // Overlay Toggles
        const bindToggle = (id, optKey) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("change", (e) => {
                    if (this.mainCraziiChart) {
                        this.mainCraziiChart.setOption(optKey, e.target.checked);
                    }
                });
            }
        };
        bindToggle("crazii-toggle-op", "showOpLine");
        bindToggle("crazii-toggle-mlp", "showMlpLine");
        bindToggle("crazii-toggle-diamond", "showDiamonds");
        bindToggle("crazii-toggle-emas", "showEmas");
        bindToggle("crazii-toggle-smc", "showSmc");
        bindToggle("crazii-toggle-volume", "showVolume");

        // Zoom controls
        const btnZoomIn = document.getElementById("crazii-zoom-in");
        if (btnZoomIn) btnZoomIn.addEventListener("click", () => this.mainCraziiChart && this.mainCraziiChart.zoom(1));

        const btnZoomOut = document.getElementById("crazii-zoom-out");
        if (btnZoomOut) btnZoomOut.addEventListener("click", () => this.mainCraziiChart && this.mainCraziiChart.zoom(-1));

        const btnReset = document.getElementById("crazii-zoom-reset");
        if (btnReset) btnReset.addEventListener("click", () => this.mainCraziiChart && this.mainCraziiChart.resetView());

        const btnFs = document.getElementById("crazii-fullscreen");
        if (btnFs) {
            btnFs.addEventListener("click", () => {
                const vp = document.getElementById("crazii-viewport");
                if (!document.fullscreenElement) {
                    vp.requestFullscreen?.().catch(() => {});
                } else {
                    document.exitFullscreen?.().catch(() => {});
                }
            });
        }

        // Fast Execution Buttons (BUY / SELL simulation directly from CRAZII terminal)
        const btnBuy = document.getElementById("crazii-btn-quick-buy");
        if (btnBuy) {
            btnBuy.addEventListener("click", () => this.executeQuickCraziiTrade("BUY"));
        }
        const btnSell = document.getElementById("crazii-btn-quick-sell");
        if (btnSell) {
            btnSell.addEventListener("click", () => this.executeQuickCraziiTrade("SELL"));
        }
    }

    async executeQuickCraziiTrade(direction) {
        if (!this.latestAnalysis || !this.latestAnalysis.latest_price) {
            this.showToast("No active market price available", "warn");
            return;
        }

        const entry = this.latestAnalysis.latest_price;
        const lots = parseFloat(document.getElementById("crazii-exec-lots")?.value || "0.10");
        const slInput = document.getElementById("crazii-exec-sl")?.value;
        const tpInput = document.getElementById("crazii-exec-tp")?.value;

        // Auto compute SL and TP if blank using ATR
        const atr = this.latestAnalysis.indicators?.latest?.atr || (entry * 0.005);
        let sl = slInput ? parseFloat(slInput) : (direction === "BUY" ? entry - (atr * 1.5) : entry + (atr * 1.5));
        let tp = tpInput ? parseFloat(tpInput) : (direction === "BUY" ? entry + (atr * 3.0) : entry - (atr * 3.0));

        sl = parseFloat(sl.toFixed(2));
        tp = parseFloat(tp.toFixed(2));

        const entryData = {
            symbol: this.currentSymbol,
            timeframe: this.currentTimeframe,
            direction: direction,
            entry_price: entry,
            sl_price: sl,
            tp_price: tp,
            lot_size: lots,
            outcome: "OPEN",
            notes: `CRAZII v10.4 Execution [OP: ${this.latestAnalysis.crazii?.op?.price || '--'}, KSI: ${this.latestAnalysis.crazii?.ksi?.score || '--'}%]`
        };

        try {
            const res = await fetch("/api/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entryData)
            });
            if (res.ok) {
                this.showToast(`🎯 CRAZII ${direction} Order Placed @ ${entry} (Lots: ${lots}, SL: ${sl}, TP: ${tp})`, "info");
                if (this.audioEnabled) this.playAudioBeep(direction === "BUY" ? 880 : 440);
            }
        } catch (e) {
            this.showToast(`Order execution error: ${e.message}`, "warn");
        }
    }

    initOrResizeMainChart() {
        const canvas = document.getElementById("crazii-main-canvas");
        if (!canvas) return;

        if (!this.mainCraziiChart) {
            this.mainCraziiChart = new CraziiCanvasChart("crazii-main-canvas", {
                isMini: false,
                showVolume: true,
                showOpLine: true,
                showMlpLine: true,
                showEmas: true,
                showSmc: true,
                showDiamonds: true,
                ccryMode: true,
                onCrosshairMove: (candle) => this.updateCraziiLegend(candle)
            });
        } else {
            this.mainCraziiChart.resize();
        }

        this.renderMainChart();
    }

    renderMainChart() {
        if (!this.mainCraziiChart || !this.latestCandles.length) return;

        const cz = this.latestAnalysis?.crazii;
        const curPrice = this.latestAnalysis?.latest_price || this.latestCandles[this.latestCandles.length - 1].close;

        // Update HUD elements
        const symEl = document.getElementById("hud-symbol");
        const tfEl = document.getElementById("hud-tf");
        const priceEl = document.getElementById("hud-price-live");
        if (symEl) symEl.textContent = this.currentSymbol;
        if (tfEl) tfEl.textContent = this.currentTimeframe;
        if (priceEl) priceEl.textContent = curPrice.toFixed(2);

        // Header ribbon pills
        if (cz) {
            const opVal = document.getElementById("hud-op-val");
            const opBias = document.getElementById("hud-op-bias");
            if (opVal) opVal.textContent = cz.op.price ? cz.op.price.toFixed(2) : "--";
            if (opBias) {
                opBias.textContent = cz.op.bias === "BUY_ONLY" ? "▲ BUY ONLY" : "▼ SELL ONLY";
                opBias.style.color = cz.op.bias === "BUY_ONLY" ? "#00e5ff" : "#ff007f";
            }

            const mlpVal = document.getElementById("hud-mlp-val");
            const mlpStatus = document.getElementById("hud-mlp-status");
            if (mlpVal) mlpVal.textContent = cz.mlp.price ? cz.mlp.price.toFixed(2) : "--";
            if (mlpStatus) mlpStatus.textContent = cz.mlp.status === "ABOVE_MLP_SUPPORT" ? "SUPPORT" : "RESIST";

            const ksiVal = document.getElementById("hud-ksi-val");
            const ksiStatus = document.getElementById("hud-ksi-status");
            if (ksiVal) ksiVal.textContent = `${cz.ksi.score}%`;
            if (ksiStatus) {
                ksiStatus.textContent = cz.ksi.score >= 50 ? "BUY INFLOW" : "SELL OUTFLOW";
                ksiStatus.style.color = cz.ksi.color;
            }

            const kcxStatus = document.getElementById("hud-kcx-status");
            if (kcxStatus) {
                kcxStatus.textContent = cz.kcx.state === "HEALTHY_FLOW" ? "HEALTHY" : "TRAP RISK";
                kcxStatus.style.color = cz.kcx.color;
            }

            // Floating Tactical HUD
            const masterBias = document.getElementById("hud-master-bias");
            if (masterBias) {
                masterBias.textContent = cz.op.badge;
                masterBias.style.color = cz.op.is_above ? "#00e5ff" : "#ff007f";
                masterBias.style.borderColor = cz.op.is_above ? "rgba(0, 229, 255, 0.4)" : "rgba(255, 0, 127, 0.4)";
            }

            const ksiPct = document.getElementById("hud-ksi-pct");
            const ksiBar = document.getElementById("hud-ksi-bar");
            if (ksiPct) ksiPct.textContent = `${cz.ksi.score}%`;
            if (ksiBar) {
                ksiBar.style.width = `${cz.ksi.score}%`;
                ksiBar.style.background = cz.ksi.score >= 50 
                    ? "linear-gradient(90deg, #00e5ff, #10b981)" 
                    : "linear-gradient(90deg, #ff007f, #dc2626)";
            }

            const confPct = document.getElementById("hud-confluence-pct");
            const confBar = document.getElementById("hud-confluence-bar");
            const score = cz.diamond_trigger?.score || 75;
            if (confPct) confPct.textContent = `${score}/100`;
            if (confBar) confBar.style.width = `${score}%`;

            const cellOp = document.getElementById("hud-cell-op");
            const cellOpDist = document.getElementById("hud-cell-op-dist");
            const cellMlp = document.getElementById("hud-cell-mlp");
            const cellKcx = document.getElementById("hud-cell-kcx");

            if (cellOp) cellOp.textContent = cz.op.price ? cz.op.price.toFixed(2) : "--";
            if (cellOpDist) cellOpDist.textContent = `${cz.op.delta >= 0 ? '+' : ''}${cz.op.delta} (${cz.op.delta_pct}%)`;
            if (cellMlp) cellMlp.textContent = cz.mlp.price ? cz.mlp.price.toFixed(2) : "--";
            if (cellKcx) {
                cellKcx.textContent = cz.kcx.state === "HEALTHY_FLOW" ? "✓ NO TRAP (HEALTHY)" : "⚠️ TRAP DETECTED";
                cellKcx.className = `stat-val ${cz.kcx.state === 'HEALTHY_FLOW' ? 'text-green' : 'text-sell'}`;
            }
        }

        // Pass latest candles and Crazii data to canvas chart
        this.mainCraziiChart.setData(this.latestCandles, cz, this.latestAnalysis);
        this.updateCraziiLegend(this.latestCandles[this.latestCandles.length - 1]);
    }

    renderMiniChart() {
        const canvas = document.getElementById("crazii-mini-canvas");
        if (!canvas || !this.latestCandles.length) return;

        if (!this.miniCraziiChart) {
            this.miniCraziiChart = new CraziiCanvasChart("crazii-mini-canvas", {
                isMini: true,
                showVolume: true,
                showOpLine: true,
                showMlpLine: true,
                showEmas: false,
                showSmc: false,
                showDiamonds: false,
                ccryMode: true
            });
        } else {
            this.miniCraziiChart.resize();
        }

        this.miniCraziiChart.setData(this.latestCandles.slice(-80), this.latestAnalysis?.crazii, this.latestAnalysis);
    }

    updateCraziiLegend(c) {
        if (!c) {
            if (this.latestCandles.length) c = this.latestCandles[this.latestCandles.length - 1];
            else return;
        }

        const date = new Date(c.time * 1000);
        const timeStr = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
        
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setTxt("leg-time", timeStr);
        setTxt("leg-open", c.open.toFixed(2));
        setTxt("leg-high", c.high.toFixed(2));
        setTxt("leg-low", c.low.toFixed(2));
        setTxt("leg-close", c.close.toFixed(2));
        setTxt("leg-vol", c.volume ? Math.round(c.volume).toLocaleString() : "--");

        const opVal = this.latestAnalysis?.crazii?.op?.price;
        if (opVal) {
            const delta = c.close - opVal;
            setTxt("leg-op-delta", `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`);
        } else {
            setTxt("leg-op-delta", "--");
        }

        setTxt("leg-candle-type", c.desc || (c.close >= c.open ? "Bullish" : "Bearish"));
    }

    startUtcClock() {
        const updateClock = () => {
            const clockEl = document.getElementById("xeno-utc-clock");
            if (clockEl) {
                const now = new Date();
                const h = String(now.getUTCHours()).padStart(2, '0');
                const m = String(now.getUTCMinutes()).padStart(2, '0');
                const s = String(now.getUTCSeconds()).padStart(2, '0');
                clockEl.textContent = `${h}:${m}:${s} UTC`;
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    initXenoGlobe() {
        const canvas = document.getElementById("xeno-globe-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const radius = 125;
        let rotationY = 0;
        let rotationX = 0.22;
        let isDragging = false;
        let lastX = 0, lastY = 0;

        const numDots = 800;
        const dots = [];
        for (let i = 0; i < numDots; i++) {
            const phi = Math.acos(1 - 2 * (i + 0.5) / numDots);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
            dots.push({
                x: radius * Math.sin(phi) * Math.cos(theta),
                y: radius * Math.cos(phi),
                z: radius * Math.sin(phi) * Math.sin(theta)
            });
        }

        const hubs = [
            { name: "New York", lat: 40.7128, lon: -74.0060, color: "#00e5ff" },
            { name: "London", lat: 51.5074, lon: -0.1278, color: "#00e676" },
            { name: "Frankfurt", lat: 50.1109, lon: 8.6821, color: "#38bdf8" },
            { name: "Tokyo", lat: 35.6762, lon: 139.6503, color: "#10b981" },
            { name: "Singapore", lat: 1.3521, lon: 103.8198, color: "#00e5ff" },
            { name: "Sydney", lat: -33.8688, lon: 151.2093, color: "#38bdf8" }
        ];

        const hubCoords = hubs.map(h => {
            const phi = (90 - h.lat) * (Math.PI / 180);
            const theta = (h.lon + 180) * (Math.PI / 180);
            return {
                ...h,
                x: -(radius * Math.sin(phi) * Math.cos(theta)),
                y: radius * Math.cos(phi),
                z: radius * Math.sin(phi) * Math.sin(theta)
            };
        });

        canvas.addEventListener("mousedown", (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            rotationY += dx * 0.008;
            rotationX += dy * 0.008;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        window.addEventListener("mouseup", () => isDragging = false);

        canvas.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
            }
        }, { passive: true });
        canvas.addEventListener("touchmove", (e) => {
            if (!isDragging || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - lastX;
            const dy = e.touches[0].clientY - lastY;
            rotationY += dx * 0.008;
            rotationX += dy * 0.008;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        }, { passive: true });
        canvas.addEventListener("touchend", () => isDragging = false);

        let pulseStep = 0;
        const animate = () => {
            pulseStep += 0.04;
            if (!isDragging) {
                rotationY += 0.0045;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius * 1.25);
            grad.addColorStop(0, "rgba(56, 189, 248, 0.09)");
            grad.addColorStop(0.7, "rgba(0, 229, 255, 0.03)");
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
            ctx.fill();

            const cosY = Math.cos(rotationY), sinY = Math.sin(rotationY);
            const cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);

            for (let i = 0; i < dots.length; i++) {
                const d = dots[i];
                const x1 = d.x * cosY + d.z * sinY;
                const z1 = -d.x * sinY + d.z * cosY;
                const y2 = d.y * cosX - z1 * sinX;
                const z2 = d.y * sinX + z1 * cosX;

                const cam = 360;
                const scale = cam / (cam - z2);
                const px = cx + x1 * scale;
                const py = cy + y2 * scale;

                if (z2 > 0) {
                    const alpha = Math.min(1, 0.25 + (z2 / radius) * 0.75);
                    const dotR = 1.25 * scale;
                    ctx.fillStyle = `rgba(230, 245, 255, ${alpha.toFixed(2)})`;
                    ctx.beginPath();
                    ctx.arc(px, py, dotR, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    const alpha = Math.max(0.04, 0.12 + (z2 / radius) * 0.08);
                    const dotR = 0.8 * scale;
                    ctx.fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
                    ctx.beginPath();
                    ctx.arc(px, py, dotR, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            const projectedHubs = hubCoords.map(h => {
                const x1 = h.x * cosY + h.z * sinY;
                const z1 = -h.x * sinY + h.z * cosY;
                const y2 = h.y * cosX - z1 * sinX;
                const z2 = h.y * sinX + z1 * cosX;
                const cam = 360;
                const scale = cam / (cam - z2);
                return {
                    name: h.name,
                    color: h.color,
                    px: cx + x1 * scale,
                    py: cy + y2 * scale,
                    z2: z2,
                    scale: scale
                };
            });

            ctx.lineWidth = 1;
            for (let i = 0; i < projectedHubs.length; i++) {
                const h1 = projectedHubs[i];
                const h2 = projectedHubs[(i + 1) % projectedHubs.length];
                if (h1.z2 > -30 && h2.z2 > -30) {
                    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
                    ctx.setLineDash([3, 4]);
                    ctx.beginPath();
                    ctx.moveTo(h1.px, h1.py);
                    const mx = (h1.px + h2.px) / 2;
                    const my = (h1.py + h2.py) / 2 - 15;
                    ctx.quadraticCurveTo(mx, my, h2.px, h2.py);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            for (let i = 0; i < projectedHubs.length; i++) {
                const h = projectedHubs[i];
                if (h.z2 > -20) {
                    const pulse = (Math.sin(pulseStep + i * 1.2) + 1) / 2;
                    ctx.strokeStyle = h.color;
                    ctx.lineWidth = 1.3;
                    ctx.beginPath();
                    ctx.arc(h.px, h.py, (4 + pulse * 4) * h.scale, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath();
                    ctx.arc(h.px, h.py, 2.5 * h.scale, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    // =========================================================
    // MULTI-MARKET CATALOGUE & WATCHLIST
    // =========================================================
    async loadMarketsCatalogue() {
        try {
            const res = await fetch("/api/markets");
            if (!res.ok) return;
            this.marketsData = await res.json();
            this.renderTickerTape();
        } catch (e) {
            console.error("Markets error:", e);
        }
    }

    renderTickerTape() {
        const track = document.getElementById("tape-track");
        if (!track || !this.marketsData) return;

        let itemsHtml = "";
        for (const [cat, symbols] of Object.entries(this.marketsData)) {
            symbols.slice(0, 3).forEach(s => {
                itemsHtml += `
                    <div class="tape-item" onclick="app.selectSymbol('${s.symbol}')">
                        <span class="tape-sym">${s.symbol}</span>
                        <span class="tape-price">${s.name}</span>
                        <span class="badge-subtle">${cat}</span>
                    </div>
                `;
            });
        }
        track.innerHTML = itemsHtml;
    }

    async loadWatchlist() {
        try {
            const res = await fetch("/api/watchlist");
            if (!res.ok) return;
            this.watchlist = await res.json();
            this.renderWatchlist();
        } catch (e) {
            console.error("Watchlist error:", e);
        }
    }

    async renderWatchlist() {
        const tbody = document.getElementById("watchlist-tbody");
        if (!tbody) return;

        let html = "";
        for (const item of this.watchlist) {
            const isCurrent = item.symbol === this.currentSymbol;
            html += `
                <tr style="${isCurrent ? 'background: rgba(212, 175, 55, 0.08);' : ''}">
                    <td><b>${item.symbol}</b></td>
                    <td><span class="badge-subtle">${item.asset_class}</span></td>
                    <td id="wl-price-${item.symbol}">--</td>
                    <td id="wl-change-${item.symbol}">--</td>
                    <td><span class="badge-gold">${item.provider}</span></td>
                    <td>
                        <button class="btn-xs btn-gold" onclick="app.selectSymbol('${item.symbol}')">Trade</button>
                        <button class="btn-xs btn-outline" onclick="app.removeWatchlist('${item.symbol}')">✕</button>
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = html;

        // Fetch quotes for watchlist items asynchronously
        for (const item of this.watchlist) {
            this.fetchWatchlistQuote(item.symbol);
        }
    }

    async fetchWatchlistQuote(symbol) {
        try {
            const res = await fetch(`/api/quote?symbol=${symbol}`);
            if (!res.ok) return;
            const q = await res.json();
            const pEl = document.getElementById(`wl-price-${symbol}`);
            const cEl = document.getElementById(`wl-change-${symbol}`);
            if (pEl) pEl.textContent = q.price ? q.price.toFixed(q.price > 500 ? 2 : 4) : "--";
            if (cEl && q.change_pct_24h !== undefined) {
                const isUp = q.change_pct_24h >= 0;
                cEl.textContent = `${isUp ? '+' : ''}${q.change_pct_24h.toFixed(2)}%`;
                cEl.className = isUp ? "text-green" : "text-sell";
            }
        } catch (e) {}
    }

    async removeWatchlist(symbol) {
        await fetch(`/api/watchlist/${symbol}`, { method: "DELETE" });
        await this.loadWatchlist();
        this.showToast(`Removed ${symbol} from watchlist`, "info");
    }

    renderCategoryView(pageId) {
        const catMap = {
            "all-markets": "ALL",
            "forex": "FOREX",
            "metals": "METALS",
            "crypto": "CRYPTO",
            "indices": "INDICES",
            "stocks": "STOCKS",
            "commodities": "COMMODITIES"
        };
        const targetCat = catMap[pageId] || "ALL";
        const gridId = pageId === "all-markets" ? "all-markets-grid" : `${pageId}-grid`;
        const grid = document.getElementById(gridId);
        if (!grid || !this.marketsData) return;

        let instruments = [];
        if (targetCat === "ALL") {
            for (const list of Object.values(this.marketsData)) {
                instruments.push(...list);
            }
        } else {
            instruments = this.marketsData[targetCat] || [];
        }

        grid.innerHTML = instruments.map(inst => `
            <div class="asset-card">
                <div class="asset-card-header">
                    <div>
                        <span class="asset-card-symbol">${inst.symbol}</span>
                        <span class="asset-card-name">${inst.name}</span>
                    </div>
                    <span class="badge-subtle">${inst.asset_class}</span>
                </div>
                <div class="asset-card-price-row">
                    <span class="asset-card-price" id="card-price-${inst.symbol}">--.--</span>
                    <span class="asset-card-change" id="card-change-${inst.symbol}">--%</span>
                </div>
                <div class="asset-card-footer">
                    <span class="asset-card-provider">⚡ ${inst.supported_providers.join(', ')}</span>
                    <button class="btn-xs btn-gold" onclick="window.app.selectSymbol('${inst.symbol}')"><i class="fa-solid fa-bolt"></i> Trade</button>
                </div>
            </div>
        `).join("");

        // Async fetch quotes
        instruments.forEach(inst => this.fetchCardQuote(inst.symbol));
    }

    async fetchCardQuote(symbol) {
        try {
            const res = await fetch(`/api/quote?symbol=${symbol}`);
            if (!res.ok) return;
            const q = await res.json();
            const pEl = document.getElementById(`card-price-${symbol}`);
            const cEl = document.getElementById(`card-change-${symbol}`);
            if (pEl) pEl.textContent = q.price ? q.price.toFixed(q.price > 500 ? 2 : 4) : "--";
            if (cEl && q.change_pct_24h !== undefined) {
                const isUp = q.change_pct_24h >= 0;
                cEl.textContent = `${isUp ? '+' : ''}${q.change_pct_24h.toFixed(2)}%`;
                cEl.style.color = isUp ? "#00e676" : "#ff3366";
            }
        } catch (e) {}
    }

    filterMarketsCategory(category) {
        const grid = document.getElementById("all-markets-grid");
        if (!grid || !this.marketsData) return;

        let list = [];
        if (category === "ALL") {
            for (const l of Object.values(this.marketsData)) list.push(...l);
        } else {
            list = this.marketsData[category] || [];
        }

        grid.innerHTML = list.map(inst => `
            <div class="asset-card">
                <div class="asset-card-header">
                    <div>
                        <span class="asset-card-symbol">${inst.symbol}</span>
                        <span class="asset-card-name">${inst.name}</span>
                    </div>
                    <span class="badge-subtle">${inst.asset_class}</span>
                </div>
                <div class="asset-card-price-row">
                    <span class="asset-card-price" id="card-price-${inst.symbol}">--.--</span>
                    <span class="asset-card-change" id="card-change-${inst.symbol}">--%</span>
                </div>
                <div class="asset-card-footer">
                    <span class="asset-card-provider">⚡ ${inst.supported_providers.join(', ')}</span>
                    <button class="btn-xs btn-gold" onclick="window.app.selectSymbol('${inst.symbol}')"><i class="fa-solid fa-bolt"></i> Trade</button>
                </div>
            </div>
        `).join("");

        list.forEach(inst => this.fetchCardQuote(inst.symbol));
    }

    // =========================================================
    // MARKET SCANNER
    // =========================================================
    async executeMarketScan() {
        const tbody = document.getElementById("scanner-tbody");
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 24px;">Scanning verified market feeds...</td></tr>`;

        const asset = document.getElementById("scan-filter-asset").value;
        const tf = document.getElementById("scan-filter-tf").value;
        const dir = document.getElementById("scan-filter-dir").value;
        const score = document.getElementById("scan-filter-score").value;
        const rsi = document.getElementById("scan-filter-rsi").value;
        const bos = document.getElementById("scan-filter-bos").checked;
        const sweep = document.getElementById("scan-filter-sweep").checked;

        let url = `/api/scanner?timeframe=${tf}&min_score=${score}&limit=50`;
        if (asset) url += `&asset_class=${asset}`;
        if (dir) url += `&direction=${dir}`;
        if (rsi) url += `&rsi_condition=${rsi}`;
        if (bos) url += `&has_bos_choch=true`;
        if (sweep) url += `&has_sweep=true`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
            const data = await res.json();
            const candidates = data.candidates || [];

            if (!candidates.length) {
                tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 24px;">No candidates matching criteria.</td></tr>`;
                return;
            }

            tbody.innerHTML = candidates.map(c => {
                const dirCls = c.signal_direction.toLowerCase();
                const priceFormatted = c.price ? c.price.toFixed(c.price > 500 ? 2 : 4) : "N/A";
                return `
                    <tr>
                        <td><b>${c.symbol}</b></td>
                        <td><span class="badge-subtle">${c.asset_class}</span></td>
                        <td>${priceFormatted}</td>
                        <td><span class="badge-gold">${c.provider}</span> <small>${c.delay_info || ''}</small></td>
                        <td><span class="badge-${c.ema_trend.toLowerCase()}">${c.ema_trend}</span></td>
                        <td>${c.rsi ? c.rsi.toFixed(1) : '--'}</td>
                        <td>${c.structure_state}</td>
                        <td>${c.bos_choch !== 'None' ? `<span class="badge-gold">${c.bos_choch}</span>` : '--'}</td>
                        <td><span class="kpi-badge signal-${dirCls}">${c.signal_direction}</span></td>
                        <td><b>${c.setup_score} / 100</b></td>
                        <td><small>${c.entry_price ? `${c.entry_price.toFixed(2)} | SL: ${c.sl_price.toFixed(2)}` : 'Wait'}</small></td>
                        <td><button class="btn-xs btn-gold" onclick="window.app.selectSymbol('${c.symbol}')">Trade</button></td>
                    </tr>
                `;
            }).join("");

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="12" style="color: #ff3366; text-align: center; padding: 20px;">
                <i class="fa-solid fa-triangle-exclamation"></i> Scan failed: ${e.message}<br>
                <small style="color: #94a3b8; display: block; margin-top: 4px;">Server is online. Click below to retry the scan.</small>
                <button class="btn-xs btn-gold" style="margin-top: 8px; cursor: pointer;" onclick="window.app.executeMarketScan()">Retry Market Scan</button>
            </td></tr>`;
        }
    }

    // =========================================================
    // MULTI-TIMEFRAME RADAR
    // =========================================================
    async loadMultiTimeframe() {
        const cardsCont = document.getElementById("mtf-matrix-cards");
        const biasPill = document.getElementById("mtf-overall-bias-pill");
        const recText = document.getElementById("mtf-rec-text");
        if (!cardsCont) return;

        cardsCont.innerHTML = `<div style="padding: 24px;">Calculating confluence across H4, H1, M15, M5...</div>`;

        try {
            const res = await fetch(`/api/mtf?symbol=${this.currentSymbol}`);
            const data = await res.json();

            if (biasPill) biasPill.textContent = `ALIGNMENT: ${data.overall_bias} (${data.confluence_score}%)`;
            if (recText) recText.textContent = data.recommendation;

            const matrix = data.matrix || {};
            cardsCont.innerHTML = Object.values(matrix).map(tf => `
                <div class="kpi-card">
                    <div class="kpi-header">
                        <span class="kpi-title">${tf.timeframe} — ${tf.role}</span>
                        <span class="kpi-badge signal-${tf.direction.toLowerCase()}">${tf.direction}</span>
                    </div>
                    <div class="kpi-value-row">
                        <span class="kpi-main-number">${tf.score} / 100</span>
                    </div>
                    <div class="kpi-footer">
                        <span>Trend: <b>${tf.ema_trend}</b></span>
                        <span>Structure: <b>${tf.structure_state}</b></span>
                    </div>
                </div>
            `).join("");

        } catch (e) {
            cardsCont.innerHTML = `<div style="color: #ff3366;">MTF error: ${e.message}</div>`;
        }
    }

    // =========================================================
    // QUANTITATIVE STRATEGY RENDERING
    // =========================================================
    renderEmaAnalysis(data) {
        const ind = data.indicators ? data.indicators.latest : {};
        const cards = document.getElementById("ema-metrics-cards");
        if (cards) {
            cards.innerHTML = `
                <div class="kpi-card">
                    <span class="kpi-title">EMA 9 / 21 CROSS</span>
                    <span class="kpi-main-number">${ind.ema_fast ? ind.ema_fast.toFixed(2) : '--'} / ${ind.ema_medium ? ind.ema_medium.toFixed(2) : '--'}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">EMA 50 / 200 BASELINE</span>
                    <span class="kpi-main-number">${ind.ema_slow ? ind.ema_slow.toFixed(2) : '--'} / ${ind.ema_baseline ? ind.ema_baseline.toFixed(2) : '--'}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">RSI (14) MOMENTUM</span>
                    <span class="kpi-main-number">${ind.rsi ? ind.rsi.toFixed(1) : '--'}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">MACD HISTOGRAM</span>
                    <span class="kpi-main-number">${ind.macd_hist ? ind.macd_hist.toFixed(3) : '--'}</span>
                </div>
            `;
        }
    }

    renderSmcAnalysis(data) {
        const smc = data.market_structure || {};
        const bosCont = document.getElementById("smc-bos-choch-list");
        if (bosCont) {
            const events = [...(smc.choch_events || []), ...(smc.bos_events || [])].slice(-5);
            bosCont.innerHTML = events.length ? events.map(e => `
                <div class="reason-item">
                    <b>${e.label || e.type}</b> at <code>${e.broken_level}</code> (Closed: ${e.close_price})
                </div>
            `).join("") : `<div class="reason-item">No structural breaks on recent bars</div>`;
        }

        const obCont = document.getElementById("smc-ob-fvg-list");
        if (obCont) {
            const obs = (smc.order_blocks || []).slice(-4);
            obCont.innerHTML = obs.length ? obs.map(ob => `
                <div class="reason-item">
                    <b>${ob.type}</b> [${ob.bottom} – ${ob.top}] ${ob.mitigated ? '<span class="badge-subtle">Mitigated</span>' : '<span class="badge-gold">Fresh Active</span>'}
                </div>
            `).join("") : `<div class="reason-item">No active order blocks in immediate range</div>`;
        }

        const sweepsCont = document.getElementById("smc-sweeps-list");
        if (sweepsCont) {
            const sweeps = (smc.liquidity_sweeps || []).slice(-3);
            sweepsCont.innerHTML = sweeps.length ? sweeps.map(s => `
                <div class="reason-item">
                    ⚡ <b>${s.label}</b> (Wick: ${s.wick_high || s.wick_low})
                </div>
            `).join("") : `<div class="reason-item">No liquidity sweeps detected</div>`;
        }

        const eqCont = document.getElementById("smc-equilibrium-display");
        if (eqCont && smc.equilibrium) {
            const eq = smc.equilibrium;
            eqCont.innerHTML = `
                <div class="reason-item">Range High: <b>${eq.range_high}</b> | Range Low: <b>${eq.range_low}</b></div>
                <div class="reason-item">50% Midpoint Equilibrium: <b>${eq.midpoint_50}</b></div>
                <div class="reason-item">Current Dealing Zone: <b class="badge-gold">${eq.zone}</b></div>
            `;
        }
    }

    renderSignalsHero(data) {
        const cont = document.getElementById("signals-hero-container");
        if (!cont || !data.signal) return;

        const sig = data.signal;
        cont.innerHTML = `
            <div class="kpi-card gold-border">
                <div class="kpi-header">
                    <span class="kpi-title">${data.symbol} — ${data.timeframe} SNIPER SETUP</span>
                    <span class="kpi-badge signal-${sig.direction.toLowerCase()}">${sig.direction}</span>
                </div>
                <div class="kpi-value-row">
                    <span class="kpi-main-number">${sig.direction} SETUP</span>
                    <span class="badge-gold">Score: ${sig.setup_score} / 100</span>
                </div>
                <div class="kpi-footer" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <div>Entry Zone: <b>${sig.entry_zone || '--'}</b></div>
                    <div>Stop Loss: <b>${sig.sl_price || '--'}</b></div>
                    <div>Targets: TP1: <b>${sig.tp1_price || '--'}</b> | TP2: <b>${sig.tp2_price || '--'}</b> | TP3: <b>${sig.tp3_price || '--'}</b></div>
                    <div>Risk-to-Reward: <b>${sig.risk_to_reward || '--'}</b></div>
                </div>
            </div>
        `;
    }

    // =========================================================
    // RISK CALCULATOR
    // =========================================================
    async computeRiskPosition() {
        const sym = document.getElementById("calc-symbol").value;
        const bal = parseFloat(document.getElementById("calc-balance").value);
        const riskPct = parseFloat(document.getElementById("calc-risk-pct").value);
        const entry = parseFloat(document.getElementById("calc-entry").value);
        const sl = parseFloat(document.getElementById("calc-sl").value);
        const tpVal = document.getElementById("calc-tp").value;
        const tp = tpVal ? parseFloat(tpVal) : null;

        if (!entry || !sl) {
            this.showToast("Please enter entry and stop loss prices", "warn");
            return;
        }

        try {
            const res = await fetch("/api/risk/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: sym,
                    account_balance: bal,
                    risk_pct: riskPct,
                    entry_price: entry,
                    sl_price: sl,
                    tp_price: tp
                })
            });
            const data = await res.json();
            if (!data.valid) {
                this.showToast(data.error || "Calculation failed", "warn");
                return;
            }

            document.getElementById("res-lots").textContent = `${data.recommended_position_size} ${data.unit_label}`;
            document.getElementById("res-cash-risk").textContent = `Target Cash Risk: $${data.actual_risk_dollars} (${data.actual_risk_pct}%)`;

            const grid = document.getElementById("res-details-grid");
            grid.innerHTML = `
                <div class="provider-card-spec-row">
                    <span class="provider-spec-label">Stop Distance</span>
                    <span class="provider-spec-val">${data.sl_distance_points} pts (${data.sl_distance_pips} pips)</span>
                </div>
                <div class="provider-card-spec-row">
                    <span class="provider-spec-label">Contract Multiplier</span>
                    <span class="provider-spec-val">${data.contract_size}</span>
                </div>
                <div class="provider-card-spec-row">
                    <span class="provider-spec-label">Risk-to-Reward</span>
                    <span class="provider-spec-val">${data.risk_to_reward_ratio ? `1:${data.risk_to_reward_ratio}` : 'N/A'}</span>
                </div>
                <div class="provider-card-spec-row">
                    <span class="provider-spec-label">Daily Limit Status</span>
                    <span class="provider-spec-val text-green">${data.circuit_breakers.daily_limit_breached ? 'BREACHED' : 'NORMAL'}</span>
                </div>
            `;
        } catch (e) {
            this.showToast("Calculation error: " + e.message, "warn");
        }
    }

    // =========================================================
    // HISTORICAL BACKTESTING
    // =========================================================
    async runBacktest() {
        const sym = document.getElementById("bt-symbol").value;
        const tf = document.getElementById("bt-timeframe").value;
        const count = parseInt(document.getElementById("bt-candle-count").value);
        const bal = parseFloat(document.getElementById("bt-balance").value);
        const risk = parseFloat(document.getElementById("bt-risk-pct").value);
        const rr = parseFloat(document.getElementById("bt-target-rr").value);
        const minScore = parseInt(document.getElementById("bt-min-score").value);

        const btn = document.getElementById("btn-run-backtest");
        btn.disabled = true;
        btn.textContent = "Simulating chronologically...";

        try {
            const res = await fetch("/api/backtest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: sym,
                    timeframe: tf,
                    candle_count: count,
                    initial_balance: bal,
                    risk_pct: risk,
                    target_rr: rr,
                    min_score: minScore
                })
            });
            const data = await res.json();
            btn.disabled = false;
            btn.textContent = "Run Backtest Simulation";

            if (!data.success) {
                this.showToast(data.error || "Backtest failed", "warn");
                return;
            }

            document.getElementById("backtest-results-container").style.display = "block";
            const m = data.metrics;
            document.getElementById("bt-metrics-kpi").innerHTML = `
                <div class="kpi-card gold-border">
                    <span class="kpi-title">WIN RATE</span>
                    <span class="kpi-main-number">${m.win_rate_pct}%</span>
                    <span class="kpi-sub-tag">${m.winning_trades}W / ${m.losing_trades}L</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">PROFIT FACTOR</span>
                    <span class="kpi-main-number">${m.profit_factor}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">NET PROFIT</span>
                    <span class="kpi-main-number ${m.net_profit >= 0 ? 'text-green' : 'text-sell'}">$${m.net_profit}</span>
                    <span class="kpi-sub-tag">${m.return_pct}% Return</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">MAX DRAWDOWN</span>
                    <span class="kpi-main-number text-sell">${m.max_drawdown_pct}%</span>
                </div>
            `;

            // Populate trades table
            const tbody = document.getElementById("bt-trades-tbody");
            tbody.innerHTML = (data.trades || []).slice(0, 30).map(t => `
                <tr>
                    <td>${t.trade_no}</td>
                    <td><b>${t.direction}</b></td>
                    <td>${t.entry_price}</td>
                    <td>${t.exit_price}</td>
                    <td>${t.lot_size}</td>
                    <td>${t.realized_r}R</td>
                    <td class="${t.net_pnl >= 0 ? 'text-green' : 'text-sell'}">$${t.net_pnl}</td>
                    <td><span class="badge-${t.outcome === 'WIN' ? 'green' : 'red'}">${t.outcome}</span></td>
                </tr>
            `).join("");

            this.showToast(`Backtest completed: ${m.total_trades} trades executed`, "info");
        } catch (e) {
            btn.disabled = false;
            btn.textContent = "Run Backtest Simulation";
            this.showToast("Backtest error: " + e.message, "warn");
        }
    }

    // =========================================================
    // TRADE JOURNAL
    // =========================================================
    async loadJournalEntries() {
        const tbody = document.getElementById("journal-tbody");
        if (!tbody) return;

        try {
            const res = await fetch("/api/journal");
            const data = await res.json();
            const entries = data.entries || [];

            // Stats KPI
            const s = data.stats || {};
            document.getElementById("journal-stats-kpi").innerHTML = `
                <div class="kpi-card gold-border">
                    <span class="kpi-title">JOURNAL WIN RATE</span>
                    <span class="kpi-main-number">${s.win_rate_pct}%</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">TOTAL TRADES</span>
                    <span class="kpi-main-number">${s.total_trades}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">NET REALIZED P/L</span>
                    <span class="kpi-main-number ${s.total_pnl >= 0 ? 'text-green' : 'text-sell'}">$${s.total_pnl}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">TOTAL R MULTIPLE</span>
                    <span class="kpi-main-number">${s.total_r}R</span>
                </div>
            `;

            tbody.innerHTML = entries.map(e => `
                <tr>
                    <td>${new Date(e.created_at || e.timestamp).toLocaleDateString()}</td>
                    <td><b>${e.symbol}</b></td>
                    <td><b>${e.direction}</b></td>
                    <td>${e.entry_price}</td>
                    <td>${e.sl_price}</td>
                    <td>${e.tp_price}</td>
                    <td><span class="badge-${e.outcome.toLowerCase()}">${e.outcome}</span></td>
                    <td>${e.realized_r}R</td>
                    <td class="${e.pnl >= 0 ? 'text-green' : 'text-sell'}">$${e.pnl}</td>
                    <td><button class="btn-xs btn-outline" onclick="app.deleteJournalEntry(${e.id})">Delete</button></td>
                </tr>
            `).join("");
        } catch (e) {}
    }

    async saveJournalEntry() {
        const payload = {
            symbol: document.getElementById("j-symbol").value,
            direction: document.getElementById("j-direction").value,
            entry_price: parseFloat(document.getElementById("j-entry").value),
            sl_price: parseFloat(document.getElementById("j-sl").value),
            tp_price: parseFloat(document.getElementById("j-tp").value),
            lot_size: parseFloat(document.getElementById("j-lots").value),
            outcome: document.getElementById("j-outcome").value,
            notes: document.getElementById("j-notes").value
        };

        try {
            const res = await fetch("/api/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                document.getElementById("journal-modal").style.display = "none";
                this.showToast("Trade saved to journal", "info");
                await this.loadJournalEntries();
            }
        } catch (e) {
            this.showToast("Error saving journal entry: " + e.message, "warn");
        }
    }

    async deleteJournalEntry(id) {
        await fetch(`/api/journal/${id}`, { method: "DELETE" });
        await this.loadJournalEntries();
        this.showToast("Entry deleted", "info");
    }

    // =========================================================
    // PROVIDER SOURCES & STATUS
    // =========================================================
    async loadProvidersStatus() {
        const cont = document.getElementById("provider-health-container");
        if (!cont) return;

        cont.innerHTML = `<div>Verifying providers...</div>`;

        try {
            const res = await fetch("/api/providers/status");
            const statuses = await res.json();

            cont.innerHTML = statuses.map(s => `
                <div class="provider-health-card ${s.is_live ? 'connected' : (s.auth_required ? 'auth-required' : '')}">
                    <div class="provider-card-header">
                        <span class="provider-card-title">${s.name}</span>
                        <span class="badge-${s.is_live ? 'green' : (s.auth_required ? 'gold' : 'red')}">${s.status}</span>
                    </div>
                    <div class="provider-card-spec-row">
                        <span class="provider-spec-label">Asset Classes</span>
                        <span class="provider-spec-val">${s.supported_asset_classes.join(', ')}</span>
                    </div>
                    <div class="provider-card-spec-row">
                        <span class="provider-spec-label">Delays</span>
                        <span class="provider-spec-val">${s.known_delays}</span>
                    </div>
                    <div class="provider-card-spec-row">
                        <span class="provider-spec-label">Rate Limits</span>
                        <span class="provider-spec-val">${s.rate_limits}</span>
                    </div>
                    <div class="provider-card-spec-row">
                        <span class="provider-spec-label">Authentication</span>
                        <span class="provider-spec-val">${s.auth_required ? (s.api_key_configured ? 'Key Verified' : 'API Key Required (.env)') : 'Public (No Key)'}</span>
                    </div>
                </div>
            `).join("");
        } catch (e) {
            cont.innerHTML = `<div style="color: #ff3366;">Error loading provider statuses: ${e.message}</div>`;
        }
    }

    // =========================================================
    // AUDIO CHIMES & SESSIONS
    // =========================================================
    playChime(freq, duration) {
        if (!this.audioEnabled) return;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            osc.type = "sine";
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {}
    }

    checkSignalAudioAlert(signal) {
        if (!signal || !this.audioEnabled) return;
        if (signal.direction !== "WAIT" && signal.direction !== this.lastSignalDirection) {
            this.lastSignalDirection = signal.direction;
            this.playChime(signal.direction === "BUY" ? 880 : 440, 0.4);
            this.showToast(`⚡ NEW ${signal.direction} SNIPER SIGNAL DETECTED!`, "info");
        }
    }

    startSessionClock() {
        setInterval(() => this.renderSessionTimes(), 10000);
    }

    renderSessionTimes() {
        const now = new Date();
        const utcH = now.getUTCHours();
        const utcM = now.getUTCMinutes();
        const pad = (n) => String(n).padStart(2, '0');

        const isOpen = (startH, endH) => (utcH >= startH && utcH < endH);

        const londonOpen = isOpen(8, 16);
        const nyOpen = isOpen(13, 21);
        const tokyoOpen = isOpen(0, 9);
        const sydneyOpen = isOpen(21, 24) || isOpen(0, 6);

        const setSession = (id, open) => {
            const el = document.getElementById(id);
            if (el) {
                const statusEl = el.querySelector(".session-status");
                if (statusEl) {
                    statusEl.textContent = open ? "OPEN" : "CLOSED";
                    statusEl.style.color = open ? "#00e676" : "#5d6578";
                }
            }
        };

        setSession("session-london", londonOpen);
        setSession("session-ny", nyOpen);
        setSession("session-tokyo", tokyoOpen);
        setSession("session-sydney", sydneyOpen);
    }

    showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `toast-item toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }
}

// Instantiate global app
window.app = new NexoraApp();
