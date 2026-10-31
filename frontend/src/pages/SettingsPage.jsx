import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Shield,
  Layers,
  Volume2,
  Bell,
  Database,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api.js';

export default function SettingsPage({ onShowToast }) {
  const [defaultSymbol, setDefaultSymbol] = useState('XAUUSD');
  const [defaultTimeframe, setDefaultTimeframe] = useState('M15');
  const [minScoreThreshold, setMinScoreThreshold] = useState(70);
  const [emaBaselineFilter, setEmaBaselineFilter] = useState(true);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [provider, setProvider] = useState('auto');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        if (res?.broker?.symbol) setDefaultSymbol(res.broker.symbol);
        if (res?.signals?.min_score_threshold) setMinScoreThreshold(res.signals.min_score_threshold);
        if (res?.indicators?.ema_200_filter !== undefined) setEmaBaselineFilter(res.indicators.ema_200_filter);
        if (res?.signals?.audio_alerts !== undefined) setAudioAlerts(res.signals.audio_alerts);
        if (res?.data_feed?.provider) setProvider(res.data_feed.provider);
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings({
        broker: { symbol: defaultSymbol },
        signals: {
          min_score_threshold: parseInt(minScoreThreshold),
          audio_alerts: audioAlerts,
          push_notifications: pushNotifications
        },
        indicators: {
          ema_200_filter: emaBaselineFilter
        },
        data_feed: {
          provider
        }
      });
      if (onShowToast) onShowToast('success', 'Settings Saved', 'Configurations updated successfully.');
    } catch (err) {
      console.error('Save settings error:', err);
      if (onShowToast) onShowToast('error', 'Error Saving', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Header Card */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <SettingsIcon size={15} color="var(--gold-primary)" />
            TERMINAL & PLATFORM CONFIGURATION
          </span>
          <span className="badge badge-gold">SYSTEM PREFERENCES</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Manage global execution parameters, algorithmic confluence thresholds, and feed routing preferences.
        </p>
      </div>

      {/* 2. Configuration Grid */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {/* General Trading Defaults */}
          <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', textTransform: 'uppercase' }}>
              GENERAL TRADING DEFAULTS
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Default Trading Instrument
              </label>
              <select value={defaultSymbol} onChange={(e) => setDefaultSymbol(e.target.value)}>
                <option value="XAUUSD">XAUUSD (Gold Spot)</option>
                <option value="BTCUSD">BTCUSD (Bitcoin / USD)</option>
                <option value="EURUSD">EURUSD (Euro / USD)</option>
                <option value="US100">US100 (Nasdaq 100)</option>
                <option value="NVDA">NVDA (Nvidia Corp)</option>
                <option value="USOIL">USOIL (WTI Crude Oil)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Default Chart Timeframe
              </label>
              <select value={defaultTimeframe} onChange={(e) => setDefaultTimeframe(e.target.value)}>
                <option value="M5">M5 (Fast Scalping)</option>
                <option value="M15">M15 (Sniper Intraday)</option>
                <option value="H1">H1 (Market Structure)</option>
                <option value="H4">H4 (Macro Context)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Primary Market Data Provider
              </label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="auto">Auto Router (Best Verified Low-Latency Feed)</option>
                <option value="mt5">Force MetaTrader 5 IPC (0ms)</option>
                <option value="binance">Force Binance Real-Time REST</option>
                <option value="yahoo">Force Yahoo Finance Cloud Feed</option>
              </select>
            </div>
          </div>

          {/* Strategy Confluence Thresholds */}
          <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', textTransform: 'uppercase' }}>
              STRATEGY CONFLUENCE THRESHOLDS
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '3px' }}>
                <span>MINIMUM SNIPER ENTRY SCORE (0 - 100)</span>
                <span className="mono text-gold">{minScoreThreshold}/100</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={minScoreThreshold}
                onChange={(e) => setMinScoreThreshold(e.target.value)}
                style={{ padding: 0, height: '24px', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Recommended: 70+. Signals below this threshold will be marked WAIT.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>200 EMA Baseline Filter</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                  Block BUY signals below 200 EMA & SELL signals above 200 EMA
                </div>
              </div>
              <input
                type="checkbox"
                checked={emaBaselineFilter}
                onChange={(e) => setEmaBaselineFilter(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--gold-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Notifications & Audio */}
          <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', textTransform: 'uppercase' }}>
              AUDIO & NOTIFICATION CHIMES
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>Audio Chimes on Diamond Signal</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                  Play institutional bell tone when DML Diamond trigger confirms
                </div>
              </div>
              <input
                type="checkbox"
                checked={audioAlerts}
                onChange={(e) => setAudioAlerts(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--gold-primary)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>Browser Push Notifications</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                  Dispatch system notification for high-probability setups
                </div>
              </div>
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--gold-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Theme Identity Info */}
            <div style={{ padding: '10px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>THEME PRESERVATION</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold-primary)', marginTop: '2px' }}>
                Dark Navy & Luxury Gold (Preserved Identity)
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-gold"
            style={{ padding: '10px 24px', fontSize: '13px' }}
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving Configurations...' : 'Save Configurations'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
