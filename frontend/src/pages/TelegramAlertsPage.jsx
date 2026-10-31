import React, { useState, useEffect } from 'react';
import {
  Send,
  BellRing,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
  Radio,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api.js';

export default function TelegramAlertsPage({ onShowToast }) {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [autoSendHighScores, setAutoSendHighScores] = useState(true);
  const [minScore, setMinScore] = useState(80);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingSignal, setIsSendingSignal] = useState(false);
  const [selectedPair, setSelectedPair] = useState('XAUUSD');
  const [selectedTf, setSelectedTf] = useState('M15');
  const [statusMsg, setStatusMsg] = useState(null);

  // Load existing settings
  useEffect(() => {
    api.getSettings()
      .then(s => {
        if (s?.telegram_bot_token) setBotToken(s.telegram_bot_token);
        if (s?.telegram_chat_id) setChatId(s.telegram_chat_id);
        if (s?.telegram_alerts_enabled != null) setAutoSendHighScores(s.telegram_alerts_enabled);
      })
      .catch(console.error);
  }, []);

  const handleTestConnection = async () => {
    if (!botToken || !chatId) {
      if (onShowToast) onShowToast('error', 'Missing Fields', 'Please enter your Telegram Bot Token and Chat ID.');
      return;
    }
    setIsTesting(true);
    setStatusMsg(null);
    try {
      const res = await api.testTelegram({ bot_token: botToken, chat_id: chatId });
      if (res?.success) {
        setStatusMsg({ type: 'success', text: res.message });
        if (onShowToast) onShowToast('success', 'Telegram Connected', 'Test alert delivered to your Telegram!');
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Connection failed.' });
        if (onShowToast) onShowToast('error', 'Telegram Error', res.message);
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
      if (onShowToast) onShowToast('error', 'Delivery Failed', err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendActiveSignal = async () => {
    setIsSendingSignal(true);
    try {
      const res = await api.sendTelegramSignal(selectedPair, selectedTf);
      if (res?.success) {
        if (onShowToast) onShowToast('success', 'Signal Dispatched', `Active ${selectedPair} signal sent to Telegram!`);
      } else {
        if (onShowToast) onShowToast('error', 'Dispatch Error', res?.message || 'Failed to send.');
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Dispatch Failed', err.message);
    } finally {
      setIsSendingSignal(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Header Card */}
      <div
        className="nx-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.25) 0%, rgba(212, 175, 55, 0.25) 100%)',
              border: '1px solid #0088cc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send size={22} color="#0088cc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                Telegram Sniper Signal Broadcaster
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                AUTOMATED MOBILE ALERTS
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Dispatch verified institutional BUY / SELL signals directly to your Telegram chat or VIP channel.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(0, 230, 118, 0.1)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <span className="live-pulse-dot" style={{ width: '8px', height: '8px' }} />
            <span style={{ fontSize: '11px', color: 'var(--color-buy)', fontWeight: 800 }}>
              24/7 AUTO-ALERT ACTIVE (XAU & BTC)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Setup Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* Credentials Form */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="nx-card-header">
            <span className="nx-card-title">
              <ShieldCheck size={16} color="var(--gold-primary)" />
              TELEGRAM BOT CONFIGURATION
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>SECURE LOCAL STORAGE</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
              TELEGRAM BOT TOKEN
            </label>
            <input
              type="password"
              placeholder="e.g. 7123456789:AAFlmQk7... (from @BotFather)"
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', fontSize: '12px' }}
            />
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '3px' }}>
              Create a free bot via Telegram @BotFather to get your API Token.
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
              YOUR CHAT ID OR CHANNEL ID
            </label>
            <input
              type="text"
              placeholder="e.g. 123456789 or @your_channel_name"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', fontSize: '12px' }}
            />
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '3px' }}>
              Send /start to @userinfobot to find your personal Telegram ID.
            </div>
          </div>

          {/* Status Alert Banner */}
          {statusMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: statusMsg.type === 'success' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 51, 102, 0.1)',
                border: `1px solid ${statusMsg.type === 'success' ? 'var(--color-buy-border)' : 'var(--color-sell-border)'}`,
                color: statusMsg.type === 'success' ? 'var(--color-buy)' : 'var(--color-sell)'
              }}
            >
              {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="btn btn-gold"
            style={{ width: '100%', padding: '12px', fontSize: '13px', fontWeight: 700 }}
          >
            <Send size={15} />
            {isTesting ? 'Verifying Telegram Handshake...' : 'Send Test Alert to Telegram'}
          </button>
        </div>

        {/* 1-Click Instant Signal Broadcaster */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="nx-card-header">
              <span className="nx-card-title">
                <Zap size={16} color="var(--cyan-neon)" />
                1-CLICK MANUAL BROADCASTER
              </span>
              <span className="badge badge-gold">VIP DISPATCH</span>
            </div>

            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Broadcast the current live confluence setup with Entry, Stop Loss, TP1, and institutional drivers to your Telegram right now.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  SYMBOL
                </label>
                <select
                  value={selectedPair}
                  onChange={e => setSelectedPair(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', fontWeight: 700 }}
                >
                  {['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'US100', 'USOIL'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  TIMEFRAME
                </label>
                <select
                  value={selectedTf}
                  onChange={e => setSelectedTf(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', fontWeight: 700 }}
                >
                  {['M5', 'M15', 'M30', 'H1', 'H4', 'D1'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto Rules */}
            <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: '4px' }}>
                AUTOMATED BROADCAST FILTER
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Min Confluence Score:</span>
                <span className="mono" style={{ color: 'var(--gold-primary)', fontWeight: 700 }}>&gt;= 75 / 100</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Risk/Reward Requirement:</span>
                <span className="mono" style={{ color: 'var(--color-buy)', fontWeight: 700 }}>Min 1 : 2.0</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSendActiveSignal}
            disabled={isSendingSignal}
            className="btn btn-buy"
            style={{ width: '100%', padding: '12px', fontSize: '13px', fontWeight: 800 }}
          >
            <Radio size={16} />
            {isSendingSignal ? 'Dispatching to Telegram...' : `Broadcast ${selectedPair} Signal Now`}
          </button>
        </div>
      </div>

      {/* 3. Setup Instructions */}
      <div className="nx-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <HelpCircle size={16} color="var(--gold-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
            3-STEP TELEGRAM SETUP GUIDE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: '3px' }}>
              1. Create Telegram Bot
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Search <strong>@BotFather</strong> on Telegram, click Start, and send <code>/newbot</code>. Copy the HTTP API token into the field above.
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: '3px' }}>
              2. Get Your Chat ID
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Search <strong>@userinfobot</strong> on Telegram and send <code>/start</code>. It will reply with your numeric ID (e.g. <code>123456789</code>).
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: '3px' }}>
              3. Channel Broadcast (Optional)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Add your bot as an Administrator to your VIP channel, then input your channel's public handle (e.g. <code>@MyTradingSignals</code>).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

