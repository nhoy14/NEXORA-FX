import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopHeader from './components/TopHeader.jsx';
import Toast from './components/Toast.jsx';
import TickerTape from './components/TickerTape.jsx';

// Pages
import DashboardPage from './pages/DashboardPage.jsx';
import CraziiChartPage from './pages/CraziiChartPage.jsx';
import MarketScannerPage from './pages/MarketScannerPage.jsx';
import AllMarketsPage from './pages/AllMarketsPage.jsx';
import CategoryMarketPage from './pages/CategoryMarketPage.jsx';
import EmaAnalysisPage from './pages/EmaAnalysisPage.jsx';
import MsnrSmcPage from './pages/MsnrSmcPage.jsx';
import MultiTimeframePage from './pages/MultiTimeframePage.jsx';
import TradingSignalsPage from './pages/TradingSignalsPage.jsx';
import BacktestingPage from './pages/BacktestingPage.jsx';
import JournalPage from './pages/JournalPage.jsx';
import RiskCalculatorPage from './pages/RiskCalculatorPage.jsx';
import ScreenshotAnalysisPage from './pages/ScreenshotAnalysisPage.jsx';
import DataSourcesPage from './pages/DataSourcesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import EconomicCalendarPage from './pages/EconomicCalendarPage.jsx';
import MultiChartGridPage from './pages/MultiChartGridPage.jsx';
import GlobalOrderFlowPage from './pages/GlobalOrderFlowPage.jsx';
import TelegramAlertsPage from './pages/TelegramAlertsPage.jsx';

import { api } from './services/api.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('M15');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-collapse sidebar on smaller screens (iPhone, iPad)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Market & Analysis Global State
  const [marketData, setMarketData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch live market data & analysis for active symbol & timeframe
  const fetchMarketData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [analysis, quote, candlesRes] = await Promise.allSettled([
        api.getAnalysis(symbol, timeframe),
        api.getQuote(symbol),
        api.getCandles(symbol, timeframe, 200)
      ]);

      let fallbackCandles = [];
      if (candlesRes.status === 'fulfilled' && candlesRes.value?.candles) {
        fallbackCandles = candlesRes.value.candles;
      }

      if (analysis.status === 'fulfilled' && analysis.value) {
        const fullAnalysis = {
          ...analysis.value,
          candles: (analysis.value.candles && analysis.value.candles.length > 0)
            ? analysis.value.candles
            : fallbackCandles
        };
        setAnalysisData(fullAnalysis);
        setMarketData((prev) => ({
          ...(prev || {}),
          ...fullAnalysis,
          price: fullAnalysis.latest_price || prev?.price
        }));
      }

      if (quote.status === 'fulfilled' && quote.value) {
        setMarketData((prev) => ({
          ...(prev || {}),
          ...quote.value,
          latest_price: quote.value.price || prev?.latest_price
        }));
      }
    } catch (err) {
      console.error('Failed to load market data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [symbol, timeframe]);

  // Initial load & symbol/timeframe changes
  useEffect(() => {
    fetchMarketData();
    // Auto-refresh poll every 10 seconds
    const interval = setInterval(fetchMarketData, 10000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Quick trade execution from Terminal
  const handleExecuteTrade = async (tradePayload) => {
    try {
      await api.addJournalEntry({
        ...tradePayload,
        outcome: 'OPEN',
        pnl: 0.0,
        notes: `Executed via 1-Click Terminal Pad on ${tradePayload.symbol} (${tradePayload.timeframe})`
      });
      showToast('success', 'Order Executed', `${tradePayload.direction} order placed for ${tradePayload.lot_size} lots on ${tradePayload.symbol}.`);
    } catch (err) {
      console.error('Execution error:', err);
      showToast('error', 'Execution Failed', err.message);
    }
  };

  // Render the dedicated view for the active navigation tab
  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            symbol={symbol}
            onSelectSymbol={setSymbol}
            timeframe={timeframe}
            marketData={marketData}
            analysisData={analysisData}
            onNavigateTab={setActiveTab}
          />
        );
      case 'crazii_chart':
        return (
          <CraziiChartPage
            symbol={symbol}
            timeframe={timeframe}
            marketData={marketData}
            analysisData={analysisData}
            onExecuteTrade={handleExecuteTrade}
          />
        );
      case 'world_order_flow':
        return (
          <GlobalOrderFlowPage
            onSelectSymbol={setSymbol}
            onNavigateTab={setActiveTab}
          />
        );
      case 'multi_grid':
        return <MultiChartGridPage />;
      case 'scanner':
        return (
          <MarketScannerPage
            onSelectSymbol={setSymbol}
            onNavigateTab={setActiveTab}
          />
        );
      case 'all_markets':
        return (
          <AllMarketsPage
            onSelectSymbol={setSymbol}
            onNavigateTab={setActiveTab}
          />
        );
      case 'forex':
      case 'metals':
      case 'crypto':
      case 'indices':
      case 'stocks':
      case 'commodities':
        return (
          <CategoryMarketPage
            categoryId={activeTab}
            onSelectSymbol={setSymbol}
            onNavigateTab={setActiveTab}
          />
        );
      case 'ema_analysis':
        return (
          <EmaAnalysisPage
            symbol={symbol}
            timeframe={timeframe}
            onSelectSymbol={setSymbol}
          />
        );
      case 'msnr_smc':
        return (
          <MsnrSmcPage
            symbol={symbol}
            timeframe={timeframe}
          />
        );
      case 'mtf':
        return (
          <MultiTimeframePage
            symbol={symbol}
            onSelectSymbol={setSymbol}
          />
        );
      case 'signals':
        return (
          <TradingSignalsPage
            onSelectSymbol={setSymbol}
            onNavigateTab={setActiveTab}
          />
        );
      case 'backtesting':
        return (
          <BacktestingPage
            onSelectSymbol={setSymbol}
            onShowToast={showToast}
          />
        );
      case 'journal':
        return (
          <JournalPage
            onShowToast={showToast}
          />
        );
      case 'risk_calc':
        return (
          <RiskCalculatorPage
            currentPrice={marketData?.latest_price || 3876.24}
            onShowToast={showToast}
          />
        );
      case 'screenshot':
        return (
          <ScreenshotAnalysisPage
            onSelectSymbol={setSymbol}
            onNavigateTab={setActiveTab}
          />
        );
      case 'data_sources':
        return (
          <DataSourcesPage
            onShowToast={showToast}
          />
        );
      case 'economic_calendar':
        return <EconomicCalendarPage />;
      case 'telegram_alerts':
        return <TelegramAlertsPage onShowToast={showToast} />;
      case 'settings':
        return (
          <SettingsPage
            onShowToast={showToast}
          />
        );
      default:
        return (
          <DashboardPage
            symbol={symbol}
            onSelectSymbol={setSymbol}
            timeframe={timeframe}
            marketData={marketData}
            analysisData={analysisData}
            onNavigateTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
      {/* 1. Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 2. Main Content Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top Header */}
        <TopHeader
          symbol={symbol}
          onSelectSymbol={setSymbol}
          timeframe={timeframe}
          onSelectTimeframe={setTimeframe}
          marketData={marketData}
          onRefresh={fetchMarketData}
          isRefreshing={isRefreshing}
        />

        {/* Live Scrolling Ticker Tape */}
        <TickerTape onSelectSymbol={(sym) => { setSymbol(sym); setActiveTab('crazii_chart'); }} />

        {/* Scrollable Page Body */}
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-app)' }}>
          {renderPage()}
        </main>
      </div>

      {/* 3. Floating Toasts */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
