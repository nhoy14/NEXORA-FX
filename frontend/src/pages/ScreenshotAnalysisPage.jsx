import React, { useState } from 'react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Target,
  Shield,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api.js';

export default function ScreenshotAnalysisPage({ onSelectSymbol, onNavigateTab }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('M15');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!previewUrl) return;
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeScreenshot({
        image_base64: previewUrl,
        symbol,
        timeframe
      });
      setAnalysisResult(res);
    } catch (err) {
      console.error('Screenshot analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. Header Card */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <Camera size={15} color="var(--gold-primary)" />
            SCREENSHOT QUANTITATIVE COMPUTER VISION ANALYSIS
          </span>
          <span className="badge badge-gold">HEURISTIC AI VISION</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Upload any chart screenshot (from TradingView, MT5, or mobile). The engine will extract structural swing boundaries, Order Blocks, FVGs, and correlate with live exchange feeds.
        </p>
      </div>

      {/* 2. Upload & Preview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '16px' }}>
        {/* Upload Deck */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Underlying Symbol
              </label>
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                <option value="XAUUSD">XAUUSD (Gold)</option>
                <option value="BTCUSD">BTCUSD (Bitcoin)</option>
                <option value="EURUSD">EURUSD (Euro)</option>
                <option value="US100">US100 (Nasdaq)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Chart Timeframe
              </label>
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                <option value="M5">M5</option>
                <option value="M15">M15</option>
                <option value="H1">H1</option>
                <option value="H4">H4</option>
                <option value="D1">D1</option>
              </select>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            style={{
              border: '2px dashed var(--gold-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '28px',
              textAlign: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                opacity: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer'
              }}
            />
            <Upload size={32} color="var(--gold-primary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              Drag & Drop chart image or click to browse
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Supports PNG, JPG, WEBP (TradingView or MT5 charts)
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAnalyze}
            disabled={!previewUrl || isAnalyzing}
            className="btn btn-gold"
            style={{ width: '100%', padding: '12px' }}
          >
            <Sparkles size={15} />
            <span>{isAnalyzing ? 'Running Computer Vision Analysis...' : 'Analyze Screenshot Structure'}</span>
          </button>

          {/* Live Preview */}
          {previewUrl && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '4px' }}>IMAGE PREVIEW:</div>
              <div style={{ maxHeight: '200px', overflow: 'hidden', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <img src={previewUrl} alt="Chart upload" style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
              </div>
            </div>
          )}
        </div>

        {/* Vision Analysis Results */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="nx-card-header">
              <span className="nx-card-title">
                <Target size={15} color="var(--gold-primary)" />
                STRUCTURAL DETECTION & SNIPER ZONES
              </span>
              <span className="badge badge-gold">AI MODEL v2</span>
            </div>

            {analysisResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Detected Signal Banner */}
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: `4px solid ${analysisResult.suggested_zones?.direction === 'BUY' ? 'var(--color-buy)' : 'var(--color-sell)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>SUGGESTED ALIGNMENT</div>
                    <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: analysisResult.suggested_zones?.direction === 'BUY' ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {analysisResult.suggested_zones?.direction} SNIPER SETUP
                    </div>
                  </div>
                  <div className="mono text-gold" style={{ fontSize: '18px', fontWeight: 700 }}>
                    {analysisResult.suggested_zones?.confidence_score}/100 Conf.
                  </div>
                </div>

                {/* Heuristic Zones */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>ESTIMATED ENTRY</div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                      {analysisResult.suggested_zones?.entry_zone?.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-sell)' }}>ESTIMATED STOP LOSS</div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-sell)' }}>
                      {analysisResult.suggested_zones?.stop_loss?.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-buy)' }}>TAKE PROFIT (TP1)</div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-buy)' }}>
                      {analysisResult.suggested_zones?.take_profit_1?.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Detected Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Detected Institutional Elements:
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    • Verified Market Price: <strong className="mono text-gold">{analysisResult.verified_market_price?.toFixed(2)}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    • Trend Direction: <strong style={{ color: '#fff' }}>{analysisResult.detected_structure?.trend}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    • Identified Order Blocks: <strong>{analysisResult.detected_structure?.order_blocks}</strong> zones
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    • Fair Value Gaps (FVG): <strong>{analysisResult.detected_structure?.fvgs}</strong> imbalances
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '36px', textAlign: 'center' }}>
                Upload a chart image on the left and click "Analyze Screenshot Structure" to view AI computer-vision detections.
              </div>
            )}
          </div>

          {/* Legal / Analytical Disclosure */}
          <div
            style={{
              padding: '10px',
              backgroundColor: 'rgba(212, 175, 55, 0.08)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--gold-border)',
              fontSize: '10px',
              color: 'var(--text-dim)',
              marginTop: '16px'
            }}
          >
            <strong>Analytical Notice:</strong> Visual estimates must be verified against live exchange order books. Educational and analytical software only.
          </div>
        </div>
      </div>
    </div>
  );
}
