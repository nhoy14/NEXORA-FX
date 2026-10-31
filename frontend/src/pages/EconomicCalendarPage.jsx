/**
 * NEXORA FX — Full Economic Calendar Page
 */
import React from 'react';
import EconomicCalendar from '../components/EconomicCalendar.jsx';
import { Calendar, Info } from 'lucide-react';

export default function EconomicCalendarPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* Page Header */}
      <div className="nx-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Calendar size={18} color="var(--gold-primary)" />
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Economic Calendar</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            High-impact macroeconomic events with live countdown timers
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', backgroundColor: 'rgba(212,175,55,0.08)',
          border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-sm)',
          fontSize: '10.5px', color: 'var(--text-muted)'
        }}>
          <Info size={12} color="var(--gold-primary)" />
          Events shown in UTC time. Hover to expand details.
        </div>
      </div>

      {/* Impact Legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { label: 'HIGH IMPACT', color: '#ff3366', desc: 'Market-moving events — expect major volatility' },
          { label: 'MEDIUM IMPACT', color: '#f59e0b', desc: 'Moderate market response expected' },
          { label: 'LOW IMPACT', color: '#64748b', desc: 'Minor reaction, monitor only' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px', backgroundColor: 'var(--bg-card)',
              border: `1px solid ${item.color}44`, borderRadius: 'var(--radius-sm)',
              borderLeft: `3px solid ${item.color}`
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: item.color }}>{item.label}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Trading Tips */}
      <div className="nx-card" style={{ padding: '12px 16px', backgroundColor: 'rgba(212,175,55,0.04)', borderColor: 'var(--gold-border)' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: '6px', textTransform: 'uppercase' }}>
          ⚡ NEXORA FX Trading Rules During News Events
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            'Avoid opening new positions 15 minutes before HIGH impact events',
            'Widen stop losses during NFP, CPI, and FOMC releases',
            'Wait for the first 5-minute candle close after the event to re-enter',
            'Spreads widen significantly during news — factor this into risk calculation',
          ].map((rule, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', flex: '1 1 280px' }}>
              <span style={{ color: 'var(--gold-primary)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              {rule}
            </div>
          ))}
        </div>
      </div>

      {/* Full Calendar */}
      <EconomicCalendar compact={false} />
    </div>
  );
}

