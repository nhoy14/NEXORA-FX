import React, { useState } from 'react';
import {
  Grid2X2,
  Maximize2,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown
} from 'lucide-react';
import CraziiCanvasChart from '../components/CraziiCanvasChart.jsx';

const AVAILABLE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'US100', 'USOIL'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

export default function MultiChartGridPage() {
  const [layout, setLayout] = useState('2x2'); // '1x2', '2x2', '1x1'

  // Panel states
  const [panels, setPanels] = useState([
    { id: 1, symbol: 'XAUUSD', timeframe: 'M5' },
    { id: 2, symbol: 'XAUUSD', timeframe: 'M15' },
    { id: 3, symbol: 'BTCUSD', timeframe: 'M15' },
    { id: 4, symbol: 'US100', timeframe: 'H1' }
  ]);

  const updatePanel = (id, field, value) => {
    setPanels(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const getGridStyle = () => {
    if (layout === '1x1') {
      return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
    }
    if (layout === '1x2') {
      return { gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: '1fr' };
    }
    return { gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' };
  };

  const visiblePanels = layout === '1x1' ? panels.slice(0, 1) : layout === '1x2' ? panels.slice(0, 2) : panels;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', height: 'calc(100vh - 90px)' }}>
      {/* Top Controls Toolbar */}
      <div
        className="nx-card"
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Grid2X2 size={16} color="var(--gold-primary)" />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            Multi-Chart Terminal Matrix
          </span>
          <span className="badge badge-gold" style={{ fontSize: '10px' }}>
            MULTI-TIMEFRAME CONFLUENCE
          </span>
        </div>

        {/* Layout Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Layout:</span>
          {[
            { id: '1x1', label: 'Single (1x1)' },
            { id: '1x2', label: 'Split (1x2)' },
            { id: '2x2', label: 'Quad (2x2)' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setLayout(btn.id)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: layout === btn.id ? 'var(--gold-primary)' : 'var(--border-subtle)',
                backgroundColor: layout === btn.id ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                color: layout === btn.id ? 'var(--gold-primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Grid Panels */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gap: '12px',
          minHeight: 0,
          ...getGridStyle()
        }}
      >
        {visiblePanels.map((panel, idx) => (
          <div
            key={panel.id}
            className="nx-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '0',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Panel Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                backgroundColor: '#090e1a',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)' }}>
                  CHART #{panel.id}
                </span>

                {/* Symbol Select */}
                <select
                  value={panel.symbol}
                  onChange={e => updatePanel(panel.id, 'symbol', e.target.value)}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    color: '#fff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '2px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {AVAILABLE_SYMBOLS.map(sym => (
                    <option key={sym} value={sym} style={{ backgroundColor: '#090e1a' }}>
                      {sym}
                    </option>
                  ))}
                </select>

                {/* Timeframe Select */}
                <select
                  value={panel.timeframe}
                  onChange={e => updatePanel(panel.id, 'timeframe', e.target.value)}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    color: 'var(--gold-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '2px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {TIMEFRAMES.map(tf => (
                    <option key={tf} value={tf} style={{ backgroundColor: '#090e1a' }}>
                      {tf}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="live-pulse-dot" style={{ width: '6px', height: '6px' }} />
                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>LIVE IPC</span>
              </div>
            </div>

            {/* Canvas Chart view */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <CraziiCanvasChart
                symbol={panel.symbol}
                timeframe={panel.timeframe}
                height={layout === '2x2' ? 320 : 540}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

