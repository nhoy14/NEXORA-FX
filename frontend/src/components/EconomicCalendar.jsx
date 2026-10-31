/**
 * NEXORA FX — Economic Calendar Widget
 * High-impact forex event calendar with countdown timers.
 */
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Static high-impact events (would be replaced by a live API like investing.com or forexfactory)
function generateEvents() {
  const now = new Date();
  const events = [
    { title: 'US Non-Farm Payrolls', currency: 'USD', impact: 'HIGH', forecast: '180K', previous: '150K', actual: null, offsetHours: 2 },
    { title: 'US CPI (YoY)', currency: 'USD', impact: 'HIGH', forecast: '3.1%', previous: '3.2%', actual: null, offsetHours: 6 },
    { title: 'FOMC Meeting Minutes', currency: 'USD', impact: 'HIGH', forecast: null, previous: null, actual: null, offsetHours: 18 },
    { title: 'ECB Interest Rate Decision', currency: 'EUR', impact: 'HIGH', forecast: '4.50%', previous: '4.50%', actual: null, offsetHours: 26 },
    { title: 'UK GDP (MoM)', currency: 'GBP', impact: 'MEDIUM', forecast: '0.1%', previous: '-0.1%', actual: null, offsetHours: 30 },
    { title: 'Japan CPI (YoY)', currency: 'JPY', impact: 'MEDIUM', forecast: '2.8%', previous: '2.5%', actual: null, offsetHours: 38 },
    { title: 'US Jobless Claims', currency: 'USD', impact: 'MEDIUM', forecast: '215K', previous: '220K', actual: '210K', offsetHours: -8 },
    { title: 'US PPI (MoM)', currency: 'USD', impact: 'MEDIUM', forecast: '0.1%', previous: '0.2%', actual: '0.0%', offsetHours: -16 },
    { title: 'Canadian Employment Change', currency: 'CAD', impact: 'HIGH', forecast: '25K', previous: '30K', actual: null, offsetHours: 50 },
    { title: 'RBA Rate Statement', currency: 'AUD', impact: 'HIGH', forecast: null, previous: null, actual: null, offsetHours: 44 },
  ];
  return events.map((e, i) => ({
    ...e,
    id: i,
    time: new Date(now.getTime() + e.offsetHours * 3600 * 1000),
    isPast: e.offsetHours < 0,
  })).sort((a, b) => a.time - b.time);
}

function Countdown({ targetTime }) {
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    const update = () => setDiff(targetTime - Date.now());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (diff <= 0) return <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>Past</span>;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const urgent = diff < 3600000; // less than 1 hour

  return (
    <span className="mono" style={{ fontSize: '10px', color: urgent ? '#f59e0b' : 'var(--text-muted)', fontWeight: urgent ? 700 : 400 }}>
      {h > 0 ? `${h}h ` : ''}{m}m {s}s
    </span>
  );
}

const IMPACT_COLORS = { HIGH: '#ff3366', MEDIUM: '#f59e0b', LOW: '#64748b' };
const CURRENCY_FLAGS = { USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', NZD: '🇳🇿', CHF: '🇨🇭', CNY: '🇨🇳' };

export default function EconomicCalendar({ compact = false }) {
  const [events] = useState(generateEvents);
  const [filter, setFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

  const filtered = events.filter((e) => filter === 'ALL' || e.impact === filter || e.currency === filter);
  const upcoming = filtered.filter((e) => !e.isPast);
  const past = filtered.filter((e) => e.isPast);
  const displayEvents = compact ? upcoming.slice(0, 5) : [...upcoming, ...past];

  return (
    <div className="nx-card" style={{ overflow: 'hidden' }}>
      <div className="nx-card-header">
        <span className="nx-card-title">
          <Calendar size={14} color="var(--gold-primary)" />
          ECONOMIC CALENDAR
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['ALL', 'HIGH', 'USD', 'EUR', 'GBP'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '2px 6px', fontSize: '9px', fontWeight: 700,
                borderRadius: '2px', border: '1px solid',
                borderColor: filter === f ? 'var(--gold-primary)' : 'var(--border-subtle)',
                backgroundColor: filter === f ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: filter === f ? 'var(--gold-primary)' : 'var(--text-dim)',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxHeight: compact ? '280px' : '420px', overflowY: 'auto' }}>
        {displayEvents.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
            No events match the filter
          </div>
        )}
        {displayEvents.map((event) => {
          const isUpcoming = !event.isPast && (event.time - Date.now()) < 7200000; // within 2hr
          return (
            <div
              key={event.id}
              onClick={() => setExpanded(expanded === event.id ? null : event.id)}
              style={{
                padding: '7px 12px',
                borderLeft: `3px solid ${IMPACT_COLORS[event.impact] || '#64748b'}`,
                backgroundColor: event.isPast
                  ? 'rgba(0,0,0,0.15)'
                  : isUpcoming
                    ? 'rgba(212, 175, 55, 0.05)'
                    : 'rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'background 0.15s',
                opacity: event.isPast ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '13px' }}>{CURRENCY_FLAGS[event.currency] || '🌐'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '2px', backgroundColor: `${IMPACT_COLORS[event.impact]}22`, color: IMPACT_COLORS[event.impact], fontWeight: 700 }}>
                        {event.impact}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                        {event.time.toUTCString().slice(5, 16)} · {event.time.toUTCString().slice(17, 22)} UTC
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  {event.isPast ? (
                    <div style={{ textAlign: 'right', fontSize: '10px' }}>
                      <div style={{ color: 'var(--text-dim)' }}>Actual</div>
                      <div className="mono" style={{ color: event.actual ? 'var(--color-buy)' : 'var(--text-dim)', fontWeight: 700 }}>
                        {event.actual || 'N/A'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>In</div>
                      <Countdown targetTime={event.time.getTime()} />
                    </div>
                  )}
                </div>
              </div>

              {expanded === event.id && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '16px', fontSize: '10px' }}>
                  <div>
                    <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>FORECAST</div>
                    <div className="mono" style={{ color: '#fff', fontWeight: 600 }}>{event.forecast || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>PREVIOUS</div>
                    <div className="mono" style={{ color: '#fff', fontWeight: 600 }}>{event.previous || 'N/A'}</div>
                  </div>
                  {event.actual && (
                    <div>
                      <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>ACTUAL</div>
                      <div className="mono" style={{ color: 'var(--color-buy)', fontWeight: 700 }}>{event.actual}</div>
                    </div>
                  )}
                  <div style={{ marginLeft: 'auto' }}>
                    <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>CURRENCY</div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{event.currency}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {compact && upcoming.length > 5 && (
        <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border-subtle)', fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center' }}>
          +{upcoming.length - 5} more upcoming events
        </div>
      )}
    </div>
  );
}

