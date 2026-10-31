import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 9999,
        maxWidth: '380px',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        const borderColor = isSuccess ? 'var(--color-buy)' : isError ? 'var(--color-sell)' : isWarning ? 'var(--color-wait)' : 'var(--gold-primary)';
        const Icon = isSuccess ? CheckCircle2 : isError ? XCircle : isWarning ? AlertTriangle : Info;

        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: '#0c1220',
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-card)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: '#fff',
              animation: 'slideUp 0.25s ease'
            }}
          >
            <Icon size={18} color={borderColor} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              {t.title && <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>{t.title}</div>}
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{t.message}</div>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
