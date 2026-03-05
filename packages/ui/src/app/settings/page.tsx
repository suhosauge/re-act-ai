'use client';

import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Server, Zap, HardDrive, Database,
  Download, Upload, Trash2, Archive, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { systemApi, backupApi } from '@/lib/api';

export default function SettingsPage() {
  const [services, setServices] = useState<Record<string, string>>({});
  const [backups, setBackups] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [config, setConfig] = useState({
    ollama_url: 'http://localhost:11434',
    qdrant_url: 'http://localhost:6333',
    clickhouse_url: 'http://localhost:8123',
    kafka_brokers: 'localhost:9092',
    redis_url: 'redis://localhost:6379',
    postgres_url: 'postgresql://admin:admin123@localhost:5432/training_platform',
    max_concurrent_jobs: '3',
    default_reward: 'composite',
    checkpoint_dir: './checkpoints',
  });

  useEffect(() => {
    systemApi.status().then(d => setServices(d.services || {})).catch(() => {});
    backupApi.list().then(d => setBackups(d.backups || [])).catch(() => {});
  }, []);

  const refreshStatus = () => {
    systemApi.status().then(d => setServices(d.services || {})).catch(() => {});
  };

  const createBackup = async () => {
    setBackupLoading(true);
    try {
      await backupApi.create(`Manual backup — ${new Date().toLocaleString()}`);
      const data = await backupApi.list();
      setBackups(data.backups || []);
    } catch {}
    setBackupLoading(false);
  };

  const restoreBackup = async (id: string) => {
    if (!confirm('⚠️ This will OVERWRITE current data. Continue?')) return;
    setRestoreId(id);
    try {
      await backupApi.restore(id);
      alert('✅ Restore completed successfully');
    } catch (e: any) {
      alert(`❌ Restore failed: ${e.message}`);
    }
    setRestoreId(null);
  };

  const deleteBackup = async (id: string) => {
    if (!confirm('Delete this backup permanently?')) return;
    try {
      await backupApi.delete(id);
      setBackups(prev => prev.filter(b => b.id !== id));
    } catch {}
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1>Settings</h1><p>Platform configuration and connections</p></div>
          <button className="btn btn-primary"><Save size={16} /> Save Changes</button>
        </div>
      </div>

      <div className="page-body">
        {/* Service Status */}
        <div className="section animate-fade-in">
          <div className="section-header">
            <h2 className="section-title">Service Connections</h2>
            <button className="btn btn-ghost btn-sm" onClick={refreshStatus}><RefreshCw size={14} /> Refresh</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[
              { name: 'PostgreSQL', key: 'postgres', icon: Database, url: config.postgres_url },
              { name: 'Ollama LLM', key: 'ollama', icon: Zap, url: config.ollama_url },
              { name: 'Qdrant Vectors', key: 'qdrant', icon: HardDrive, url: config.qdrant_url },
              { name: 'ClickHouse', key: 'clickhouse', icon: Server, url: config.clickhouse_url },
            ].map(svc => {
              const Icon = svc.icon;
              const status = services[svc.key] || 'unknown';
              return (
                <div key={svc.key} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} style={{ color: 'var(--text-accent)' }} />
                      <span style={{ fontWeight: 600 }}>{svc.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`status-dot ${status}`} />
                      <span style={{ fontSize: '12px', color: status === 'connected' ? 'var(--accent-emerald)' : 'var(--accent-rose)', textTransform: 'capitalize' }}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {svc.url}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="section" style={{ marginBottom: '32px' }}>
          <div className="section-header">
            <h2 className="section-title">Backup & Restore</h2>
            <button className="btn btn-primary btn-sm" onClick={createBackup} disabled={backupLoading}>
              {backupLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {backupLoading ? 'Creating...' : 'Create Backup'}
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Full system backup: PostgreSQL metadata, ClickHouse market data, Qdrant vectors, model checkpoints
          </p>

          {backups.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Archive size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No backups yet. Create one to protect your data.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Backup</th>
                    <th>Date</th>
                    <th>Components</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th style={{ width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{b.id}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {new Date(b.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(b.components || []).map((c: string) => (
                            <span key={c} style={{
                              padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                              background: 'var(--bg-card)', color: 'var(--text-accent)', border: '1px solid var(--border-subtle)',
                            }}>{c}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize: '13px' }}>{formatSize(b.size_bytes || 0)}</td>
                      <td>
                        <span className={`badge ${b.status === 'completed' ? 'badge-completed' : 'badge-failed'}`}>
                          {b.status === 'completed' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn-icon"
                            title="Restore"
                            onClick={() => restoreBackup(b.id)}
                            disabled={restoreId === b.id || b.status !== 'completed'}
                          >
                            {restoreId === b.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          </button>
                          <button className="btn-icon" title="Delete" onClick={() => deleteBackup(b.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Connection URLs */}
        <div className="section">
          <h2 className="section-title" style={{ marginBottom: '20px' }}>Connection Settings</h2>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { label: 'Ollama URL', key: 'ollama_url' },
                { label: 'Qdrant URL', key: 'qdrant_url' },
                { label: 'ClickHouse URL', key: 'clickhouse_url' },
                { label: 'Kafka Brokers', key: 'kafka_brokers' },
                { label: 'Redis URL', key: 'redis_url' },
                { label: 'PostgreSQL URL', key: 'postgres_url' },
              ].map(field => (
                <div className="form-group" key={field.key} style={{ marginBottom: 0 }}>
                  <label className="form-label">{field.label}</label>
                  <input className="form-input" value={(config as any)[field.key]}
                    onChange={e => setConfig({ ...config, [field.key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Training Defaults */}
        <div className="section" style={{ marginTop: '32px' }}>
          <h2 className="section-title" style={{ marginBottom: '20px' }}>Training Defaults</h2>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Max Concurrent Jobs</label>
                <input className="form-input" type="number" value={config.max_concurrent_jobs}
                  onChange={e => setConfig({ ...config, max_concurrent_jobs: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Default Reward Function</label>
                <select className="form-select" value={config.default_reward}
                  onChange={e => setConfig({ ...config, default_reward: e.target.value })}>
                  <option value="pnl">PnL</option><option value="sharpe">Sharpe</option>
                  <option value="drawdown_penalty">Drawdown Penalty</option><option value="composite">Composite</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Checkpoint Directory</label>
                <input className="form-input" value={config.checkpoint_dir}
                  onChange={e => setConfig({ ...config, checkpoint_dir: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

