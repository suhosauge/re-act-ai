'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Server, Zap, HardDrive, Database } from 'lucide-react';
import { systemApi } from '@/lib/api';

export default function SettingsPage() {
  const [services, setServices] = useState<Record<string, string>>({});
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
  }, []);

  const refreshStatus = () => {
    systemApi.status().then(d => setServices(d.services || {})).catch(() => {});
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
