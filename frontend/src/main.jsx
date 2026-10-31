import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('NEXORA Terminal React Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#070a12',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#d4af37', marginBottom: '8px' }}>
            NEXORA FX TERMINAL
          </div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
            Terminal encountered an initialization error.
          </div>
          <button
            onClick={() => { window.location.reload(); }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#d4af37',
              color: '#070a12',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Reload Terminal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
