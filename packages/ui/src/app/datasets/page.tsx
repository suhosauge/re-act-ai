'use client';

import { useState } from 'react';
import { Plus, Database, Calendar, BarChart3, Eye } from 'lucide-react';

const MOCK_DATASETS = [
  { id: '1', name: 'BTC 2024 Full Year', symbols: ['BTCUSDT'], timeframe: '1h', start_date: '2024-01-01', end_date: '2024-12-31', row_count: 8760, status: 'ready' },
  { id: '2', name: 'ETH + SOL Q1 2025', symbols: ['ETHUSDT', 'SOLUSDT'], timeframe: '15m', start_date: '2025-01-01', end_date: '2025-03-31', row_count: 34560, status: 'ready' },
  { id: '3', name: 'Multi-Asset 5m', symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'], timeframe: '5m', start_date: '2025-01-01', end_date: '2025-06-01', row_count: 175680, status: 'ready' },
  { id: '4', name: 'BTC 2026 Live', symbols: ['BTCUSDT'], timeframe: '1m', start_date: '2026-01-01', end_date: '2026-03-05', row_count: 92160, status: 'building' },
];

export default function DatasetsPage() {
  const [datasets] = useState(MOCK_DATASETS);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Datasets</h1>
            <p>Manage market data datasets for training</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Dataset
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {datasets.map(ds => (
            <div key={ds.id} className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{ds.name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-accent)' }}>{ds.timeframe} candles</span>
                </div>
                <span className={`badge ${ds.status === 'ready' ? 'badge-completed' : 'badge-paused'}`}>
                  {ds.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {ds.symbols.map(s => (
                  <span key={s} style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)',
                  }}>{s}</span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {ds.start_date} → {ds.end_date.split('-').slice(1).join('-')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {ds.row_count.toLocaleString()} rows
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Dataset</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="e.g. BTC 2025 Hourly" />
              </div>
              <div className="form-group">
                <label className="form-label">Symbols</label>
                <input className="form-input" placeholder="BTCUSDT, ETHUSDT" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Timeframe</label>
                <select className="form-select">
                  <option value="1m">1 minute</option><option value="5m">5 minutes</option>
                  <option value="15m">15 minutes</option><option value="1h" selected>1 hour</option>
                  <option value="4h">4 hours</option><option value="1d">1 day</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
