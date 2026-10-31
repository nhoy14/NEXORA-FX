import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Check,
  X,
  ExternalLink,
  Download
} from 'lucide-react';
import { api } from '../services/api.js';

export default function JournalPage({ onShowToast }) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('M15');
  const [direction, setDirection] = useState('BUY');
  const [entryPrice, setEntryPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');
  const [tpPrice, setTpPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [lotSize, setLotSize] = useState('0.10');
  const [pnl, setPnl] = useState('');
  const [outcome, setOutcome] = useState('OPEN');
  const [strategyTags, setStrategyTags] = useState('CRAZII_OP_PULLBACK');
  const [notes, setNotes] = useState('');

  const fetchJournal = async () => {
    setIsLoading(true);
    try {
      const res = await api.getJournal();
      setEntries(res?.entries || []);
    } catch (err) {
      console.error('Fetch journal error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJournal();
  }, []);

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    try {
      await api.addJournalEntry({
        symbol,
        timeframe,
        direction,
        entry_price: parseFloat(entryPrice) || 0,
        sl_price: parseFloat(slPrice) || 0,
        tp_price: parseFloat(tpPrice) || 0,
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        lot_size: parseFloat(lotSize) || 0.1,
        pnl: parseFloat(pnl) || 0,
        outcome,
        strategy_tags: strategyTags,
        notes
      });
      setShowAddModal(false);
      fetchJournal();
      if (onShowToast) onShowToast('success', 'Trade Logged', 'Trade record saved persistently to database.');
    } catch (err) {
      console.error('Add journal entry error:', err);
      if (onShowToast) onShowToast('error', 'Save Failed', err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteJournalEntry(id);
      fetchJournal();
      if (onShowToast) onShowToast('success', 'Entry Removed', 'Trade record deleted.');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // KPI calculations
  const totalPnL = entries.reduce((acc, curr) => acc + (curr.pnl || 0), 0);
  const closedTrades = entries.filter((e) => e.outcome !== 'OPEN');
  const winningTrades = closedTrades.filter((e) => e.outcome === 'WIN');
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  const exportCSV = () => {
    if (!entries || entries.length === 0) {
      if (onShowToast) onShowToast('error', 'Export Failed', 'No trade records to export.');
      return;
    }
    const headers = ['ID', 'Date', 'Symbol', 'TF', 'Direction', 'Lots', 'Entry', 'Exit', 'SL', 'TP', 'PnL', 'Outcome', 'Strategy', 'Notes'];
    const rows = entries.map(e => [
      e.id,
      e.created_at || '',
      e.symbol,
      e.timeframe,
      e.direction,
      e.lot_size,
      e.entry_price,
      e.exit_price || '',
      e.sl_price,
      e.tp_price,
      e.pnl,
      e.outcome,
      `"${(e.strategy_tags || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NEXORA_FX_Trade_Journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', 'Export Completed', 'Trade journal saved as CSV.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* 1. KPI Overview & Add Button */}
      <div className="nx-card">
        <div className="nx-card-header">
          <span className="nx-card-title">
            <BookOpen size={15} color="var(--gold-primary)" />
            INSTITUTIONAL TRADE JOURNAL & AUDIT LOG
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={exportCSV}
              className="btn btn-subtle"
              style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Export all trades to CSV"
            >
              <Download size={13} color="var(--gold-primary)" /> Export CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-gold"
              style={{ padding: '6px 14px', fontSize: '11.5px' }}
            >
              <Plus size={14} /> Log New Trade
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>TOTAL NET PNL</div>
            <div
              className={`mono ${totalPnL >= 0 ? 'text-buy' : 'text-sell'}`}
              style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}
            >
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>JOURNAL WIN RATE</div>
            <div className="mono text-gold" style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
              {winRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
              {winningTrades.length} Wins / {closedTrades.length - winningTrades.length} Losses
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>OPEN POSITIONS</div>
            <div className="mono text-cyan" style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
              {entries.filter((e) => e.outcome === 'OPEN').length} Active
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>DATABASE PERSISTENCE</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-buy)', marginTop: '4px' }}>
              SQLite Synced ✓
            </div>
          </div>
        </div>
      </div>

      {/* 2. Add Trade Modal / Form */}
      {showAddModal && (
        <div className="nx-card" style={{ border: '1px solid var(--gold-border)' }}>
          <div className="nx-card-header">
            <span className="nx-card-title text-gold">+ RECORD NEW TRADE EXECUTION</span>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveEntry}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  Symbol
                </label>
                <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} required />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  Timeframe
                </label>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                  <option value="M5">M5</option>
                  <option value="M15">M15</option>
                  <option value="H1">H1</option>
                  <option value="H4">H4</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  Direction
                </label>
                <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="BUY">BUY (Long)</option>
                  <option value="SELL">SELL (Short)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  Entry Price
                </label>
                <input type="number" step="any" placeholder="3876.20" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--color-sell)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  Stop Loss
                </label>
                <input type="number" step="any" placeholder="3860.00" value={slPrice} onChange={(e) => setSlPrice(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--color-buy)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  Take Profit
                </label>
                <input type="number" step="any" placeholder="3910.00" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  Lot Size
                </label>
                <input type="number" step="0.01" value={lotSize} onChange={(e) => setLotSize(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  Status / Outcome
                </label>
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                  <option value="OPEN">OPEN (Running)</option>
                  <option value="WIN">WIN (Take Profit Hit)</option>
                  <option value="LOSS">LOSS (Stop Loss Hit)</option>
                  <option value="BREAKEVEN">BREAKEVEN</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                  PnL ($)
                </label>
                <input type="number" step="any" placeholder="+250.00" value={pnl} onChange={(e) => setPnl(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                Trade Notes & Confluence Reasoning
              </label>
              <textarea
                rows={2}
                placeholder="Entered on CRAZII OP line bounce with M15 CHoCH confirmation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-subtle">
                Cancel
              </button>
              <button type="submit" className="btn btn-gold">
                Save Trade to Journal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Trades Table */}
      <div className="nx-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>SYMBOL</th>
                <th>DIR</th>
                <th>ENTRY</th>
                <th>SL</th>
                <th>TP</th>
                <th>LOTS</th>
                <th>PNL ($)</th>
                <th>OUTCOME</th>
                <th>STRATEGY</th>
                <th>NOTES</th>
                <th style={{ textAlign: 'center' }}>DELETE</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    No trades logged in database yet. Click "+ Log New Trade" above to record your first execution.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isBuy = entry.direction === 'BUY';
                  const isWin = entry.outcome === 'WIN';
                  const isLoss = entry.outcome === 'LOSS';
                  const isBreakeven = entry.outcome === 'BREAKEVEN';

                  const exportCSV = () => {
    if (!entries || entries.length === 0) {
      if (onShowToast) onShowToast('error', 'Export Failed', 'No trade records to export.');
      return;
    }
    const headers = ['ID', 'Date', 'Symbol', 'TF', 'Direction', 'Lots', 'Entry', 'Exit', 'SL', 'TP', 'PnL', 'Outcome', 'Strategy', 'Notes'];
    const rows = entries.map(e => [
      e.id,
      e.created_at || '',
      e.symbol,
      e.timeframe,
      e.direction,
      e.lot_size,
      e.entry_price,
      e.exit_price || '',
      e.sl_price,
      e.tp_price,
      e.pnl,
      e.outcome,
      `"${(e.strategy_tags || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NEXORA_FX_Trade_Journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', 'Export Completed', 'Trade journal saved as CSV.');
  };

  return (
                    <tr key={entry.id}>
                      <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                        {entry.created_at ? new Date(entry.created_at).toLocaleString() : '--'}
                      </td>
                      <td className="mono" style={{ fontWeight: 700, color: '#fff' }}>
                        {entry.symbol} <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>({entry.timeframe})</span>
                      </td>
                      <td>
                        <span className={`badge ${isBuy ? 'badge-buy' : 'badge-sell'}`}>
                          {entry.direction}
                        </span>
                      </td>
                      <td className="mono">{entry.entry_price ? entry.entry_price.toFixed(2) : '--'}</td>
                      <td className="mono text-sell">{entry.sl_price ? entry.sl_price.toFixed(2) : '--'}</td>
                      <td className="mono text-buy">{entry.tp_price ? entry.tp_price.toFixed(2) : '--'}</td>
                      <td className="mono">{entry.lot_size ? entry.lot_size.toFixed(2) : '0.10'}</td>
                      <td className="mono" style={{ fontWeight: 700, color: (entry.pnl || 0) >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                        {(entry.pnl || 0) >= 0 ? '+' : ''}${(entry.pnl || 0).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${isWin ? 'badge-buy' : isLoss ? 'badge-sell' : isBreakeven ? 'badge-dim' : 'badge-wait'}`}>
                          {entry.outcome}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {entry.strategy_tags || '--'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-dim)', fontSize: '11px' }}>
                        {entry.notes || '--'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Delete trade entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
