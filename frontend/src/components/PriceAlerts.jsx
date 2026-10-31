/**
 * NEXORA FX — Price Alert Manager
 * Set price alerts with browser notifications.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellOff, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../services/api.js';
import { soundEngine } from '../services/soundEngine.js';

export default function PriceAlerts({ symbol, currentPrice }) {
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexora_alerts') || '[]'); }
    catch { return []; }
  });
  const [newPrice, setNewPrice] = useState('');
  const [newDir, setNewDir] = useState('above');
  const [notifPermission, setNotifPermission] = useState(Notification?.permission ?? 'default');
  const [open, setOpen] = useState(false);
  const triggeredRef = useRef(new Set());

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('nexora_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Check alerts on price update
  useEffect(() => {
    if (!currentPrice || currentPrice <= 0) return;
    alerts.forEach((alert) => {
      if (triggeredRef.current.has(alert.id)) return;
      const triggered =
        (alert.direction === 'above' && currentPrice >= alert.price) ||
        (alert.direction === 'below' && currentPrice <= alert.price);
      if (triggered) {
        triggeredRef.current.add(alert.id);
        // Play Audio Chime
        soundEngine.playAlertTrigger();
        // Browser notification
        if (Notification?.permission === 'granted') {
          new Notification(`NEXORA FX Alert: ${alert.symbol}`, {
            body: `Price ${alert.direction === 'above' ? '▲ crossed above' : '▼ dropped below'} ${alert.price.toFixed(2)}\nCurrent: ${currentPrice.toFixed(2)}`,
            icon: '/favicon.ico',
          });
        }
        // Mark as triggered
        setAlerts((prev) =>
          prev.map((a) => a.id === alert.id ? { ...a, triggered: true, triggeredAt: new Date().toISOString() } : a)
        );
      }
    });
  }, [currentPrice, alerts]);

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  const addAlert = () => {
    const price = parseFloat(newPrice);
    if (!price || isNaN(price) || price <= 0) return;
    const newAlert = {
      id: Date.now(),
      symbol,
      price,
      direction: newDir,
      createdAt: new Date().toISOString(),
      triggered: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setNewPrice('');
  };

  const deleteAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    triggeredRef.current.delete(id);
  };

  const clearTriggered = () => {
    setAlerts((prev) => prev.filter((a) => !a.triggered));
  };

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);
  const hasTriggered = symbolAlerts.some((a) => a.triggered);

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '5px 9px',
          backgroundColor: open ? 'rgba(212,175,55,0.12)' : 'transparent',
          border: `1px solid ${symbolAlerts.length > 0 ? 'var(--gold-border)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-sm)',
          color: symbolAlerts.length > 0 ? 'var(--gold-primary)' : 'var(--text-dim)',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          position: 'relative',
        }}
        title="Price Alerts"
      >
        <Bell size={13} />
        {symbolAlerts.length > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '14px', height: '14px', borderRadius: '50%',
            backgroundColor: hasTriggered ? 'var(--color-buy)' : 'var(--gold-primary)',
            color: '#000', fontSize: '8px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {symbolAlerts.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: '300px', backgroundColor: '#0c1220',
          border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-card)', zIndex: 200, padding: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)' }}>
              PRICE ALERTS — {symbol}
            </span>
            {notifPermission !== 'granted' && (
              <button
                onClick={requestNotifPermission}
                style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid var(--gold-border)', color: 'var(--gold-primary)', borderRadius: '2px', cursor: 'pointer' }}
              >
                Enable Notifications
              </button>
            )}
          </div>

          {notifPermission === 'granted' && (
            <div style={{ fontSize: '9px', color: 'var(--color-buy)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={10} /> Browser notifications enabled
            </div>
          )}

          {/* Add Alert Form */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <select
              value={newDir}
              onChange={(e) => setNewDir(e.target.value)}
              style={{ flex: '0 0 70px', padding: '5px', fontSize: '10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="above">▲ Above</option>
              <option value="below">▼ Below</option>
            </select>
            <input
              type="number"
              placeholder={currentPrice > 0 ? currentPrice.toFixed(2) : 'Price'}
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAlert()}
              style={{ flex: 1, padding: '5px', fontSize: '11px' }}
            />
            <button
              onClick={addAlert}
              style={{
                padding: '5px 8px', backgroundColor: 'rgba(212,175,55,0.15)',
                border: '1px solid var(--gold-border)', color: 'var(--gold-primary)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Alert List */}
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {symbolAlerts.length === 0 ? (
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', padding: '12px' }}>
                No alerts set for {symbol}
              </div>
            ) : symbolAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: alert.triggered ? 'rgba(0, 230, 118, 0.08)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${alert.triggered ? 'rgba(0,230,118,0.2)' : 'var(--border-subtle)'}`,
                  fontSize: '10.5px',
                }}
              >
                <span style={{ color: alert.direction === 'above' ? 'var(--color-buy)' : 'var(--color-sell)', fontWeight: 700 }}>
                  {alert.direction === 'above' ? '▲' : '▼'}
                </span>
                <span className="mono" style={{ flex: 1, marginLeft: '6px' }}>{alert.price.toFixed(2)}</span>
                {alert.triggered && (
                  <span style={{ fontSize: '9px', color: 'var(--color-buy)', marginRight: '6px' }}>✓ HIT</span>
                )}
                <button
                  onClick={() => deleteAlert(alert.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>

          {hasTriggered && (
            <button
              onClick={clearTriggered}
              style={{ width: '100%', marginTop: '8px', padding: '5px', fontSize: '10px', backgroundColor: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-dim)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            >
              Clear Triggered Alerts
            </button>
          )}
        </div>
      )}
    </div>
  );
}

