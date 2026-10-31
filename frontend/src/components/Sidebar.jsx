import React from 'react';
import {
  LayoutDashboard,
  CandlestickChart,
  ScanLine,
  Globe2,
  DollarSign,
  Gem,
  Coins,
  TrendingUp,
  Briefcase,
  Flame,
  Activity,
  Layers,
  Grid,
  Radio,
  History,
  BookOpen,
  Calculator,
  Camera,
  Server,
  Settings,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Grid2X2,
  Send
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, isCollapsed, onToggleCollapse }) {
  const navSections = [
    {
      title: 'TERMINAL',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'crazii_chart', label: 'CRAZII Pro Chart', icon: CandlestickChart, badge: 'PRO' },
        { id: 'world_order_flow', label: 'World Trades Live', icon: Globe2, badge: 'LIVE' },
        { id: 'multi_grid', label: 'Multi-Chart Matrix', icon: Grid2X2, badge: 'NEW' },
        { id: 'scanner', label: 'Market Scanner', icon: ScanLine },
        { id: 'all_markets', label: 'All Markets', icon: Layers },
      ]
    },
    {
      title: 'ASSET HUBS',
      items: [
        { id: 'forex', label: 'Forex Currencies', icon: DollarSign },
        { id: 'metals', label: 'Precious Metals', icon: Gem, badge: 'GOLD' },
        { id: 'crypto', label: 'Crypto 24/7', icon: Coins },
        { id: 'indices', label: 'World Indices', icon: TrendingUp },
        { id: 'stocks', label: 'Equities & Tech', icon: Briefcase },
        { id: 'commodities', label: 'Commodities & Oil', icon: Flame },
      ]
    },
    {
      title: 'QUANTITATIVE & SMC',
      items: [
        { id: 'ema_analysis', label: 'EMA Alignment', icon: Activity },
        { id: 'msnr_smc', label: 'MSNR / SMC Concepts', icon: Layers },
        { id: 'mtf', label: 'Multi-Timeframe Matrix', icon: Grid },
        { id: 'signals', label: 'Trading Signals', icon: Radio },
      ]
    },
    {
      title: 'INTELLIGENCE & RISK',
      items: [
        { id: 'telegram_alerts', label: 'Telegram VIP Alerts', icon: Send, badge: 'HOT' },
        { id: 'backtesting', label: 'Historical Backtest', icon: History },
        { id: 'journal', label: 'Trading Journal', icon: BookOpen },
        { id: 'risk_calc', label: 'Risk & Lot Calculator', icon: Calculator },
        { id: 'screenshot', label: 'Screenshot AI Vision', icon: Camera },
        { id: 'economic_calendar', label: 'Economic Calendar', icon: CalendarDays, badge: 'NEW' },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'data_sources', label: 'Data Sources & Latency', icon: Server },
        { id: 'settings', label: 'Terminal Settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside
      style={{
        width: isCollapsed ? '64px' : '240px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        zIndex: 20
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '0' : '0 16px',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #d4af37 0%, #b8972e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px',
              color: '#070a12',
              letterSpacing: '-0.05em',
              boxShadow: 'var(--shadow-gold)',
              flexShrink: 0
            }}
          >
            NX
          </div>
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: '#fff' }}>
                NEXORA <span style={{ color: 'var(--gold-primary)' }}>FX</span>
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                INSTITUTIONAL v2.1
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px'
        }}
      >
        {navSections.map((sec, secIdx) => (
          <div key={secIdx} style={{ marginBottom: '14px' }}>
            {!isCollapsed && (
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.08em',
                  padding: '4px 8px',
                  textTransform: 'uppercase'
                }}
              >
                {sec.title}
              </div>
            )}
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    margin: '2px 0',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                    color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)',
                    borderLeft: isActive ? '3px solid var(--gold-primary)' : '3px solid transparent',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <Icon size={16} color={isActive ? 'var(--gold-primary)' : 'currentColor'} style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '2px',
                        background: item.badge === 'PRO' ? 'rgba(255, 0, 127, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                        color: item.badge === 'PRO' ? 'var(--crazii-magenta)' : 'var(--gold-primary)',
                        fontWeight: 700
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Status / Toggle */}
      <div
        style={{
          padding: '10px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}
      >
        {!isCollapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-pulse-dot" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-buy)', letterSpacing: '0.04em' }}>
                DIRECT STREAM
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>0ms MetaTrader 5</span>
            </div>
          </div>
        ) : (
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '4px'
            }}
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
