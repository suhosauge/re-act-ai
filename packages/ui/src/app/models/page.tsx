'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Box, Rocket, Archive, Tag, CheckCircle2, Clock, Edit3 } from 'lucide-react';
import { modelsApi } from '@/lib/api';

const MOCK_MODELS = [
  { id: '1', name: 'PPO BTC Momentum', type: 'rl_ppo', status: 'deployed', tags: ['btc', 'momentum'], created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-05T08:00:00Z', best_metric: { sharpe: 1.82, return: 18.4 } },
  { id: '2', name: 'DQN ETH Multi-Signal', type: 'rl_dqn', status: 'validated', tags: ['eth', 'multi-timeframe'], created_at: '2026-02-20T14:00:00Z', updated_at: '2026-03-03T18:00:00Z', best_metric: { sharpe: 1.45, return: 12.1 } },
  { id: '3', name: 'LLM Market Analyst', type: 'llm_finetune', status: 'training', tags: ['llm', 'reasoning'], created_at: '2026-03-05T06:00:00Z', updated_at: '2026-03-05T12:00:00Z', best_metric: {} },
  { id: '4', name: 'Genetic Grid Strat', type: 'genetic', status: 'archived', tags: ['grid', 'legacy'], created_at: '2026-01-15T09:00:00Z', updated_at: '2026-02-10T16:00:00Z', best_metric: { sharpe: 0.84, return: 5.2 } },
];

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  draft: { color: 'var(--text-muted)', icon: Edit3 },
  training: { color: 'var(--accent-amber)', icon: Clock },
  validated: { color: 'var(--accent-indigo)', icon: CheckCircle2 },
  deployed: { color: 'var(--accent-emerald)', icon: Rocket },
  archived: { color: 'var(--text-muted)', icon: Archive },
};

export default function ModelsPage() {
  const [models, setModels] = useState(MOCK_MODELS);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    modelsApi.list().then(d => { if (d.models?.length) setModels(d.models as any); }).catch(() => {});
  }, []);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Model Registry</h1>
            <p>Track, compare, and deploy trained models</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Register Model
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {models.map((model) => {
            const cfg = STATUS_CONFIG[model.status] || STATUS_CONFIG.draft;
            const Icon = cfg.icon;
            return (
              <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{ padding: '24px', cursor: 'pointer', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{model.name}</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-accent)' }}>{model.type.replace('_', '-').toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: cfg.color, fontSize: '13px', fontWeight: 600 }}>
                      <Icon size={14} />
                      <span style={{ textTransform: 'capitalize' }}>{model.status}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {(model.tags || []).map((tag: string) => (
                      <span key={tag} style={{
                        padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                        background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid rgba(99,102,241,0.2)'
                      }}>
                        <Tag size={10} style={{ marginRight: '4px' }} />{tag}
                      </span>
                    ))}
                  </div>

                  {/* Metrics */}
                  {model.best_metric?.sharpe && (
                    <div style={{ display: 'flex', gap: '24px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sharpe</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>{model.best_metric.sharpe}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Return</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: model.best_metric.return > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                          {model.best_metric.return > 0 ? '+' : ''}{model.best_metric.return}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {new Date(model.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Register New Model</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <CreateModelForm onClose={() => setShowCreate(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function CreateModelForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('rl_ppo');
  const [desc, setDesc] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    try { await modelsApi.create({ name, type, description: desc }); } catch {}
    onClose();
    window.location.reload();
  };

  return (
    <>
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Model Name</label>
          <input className="form-input" placeholder="e.g. PPO BTC Strategy" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
            <option value="rl_ppo">RL-PPO</option><option value="rl_dqn">RL-DQN</option>
            <option value="rl_sac">RL-SAC</option><option value="llm_finetune">LLM Fine-tune</option>
            <option value="genetic">Genetic</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" placeholder="Optional description" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim()}>Register</button>
      </div>
    </>
  );
}
