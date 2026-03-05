'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus, Play, Pause, Square, Trash2, Filter,
  Brain, ChevronDown, Loader2, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { trainingJobsApi } from '@/lib/api';

const MOCK_JOBS = [
  { id: '1', name: 'PPO BTC Momentum v3', type: 'rl_ppo', status: 'running', progress: 67, created_at: '2026-03-05T08:00:00Z', started_at: '2026-03-05T08:01:00Z' },
  { id: '2', name: 'LLM Market Reasoning', type: 'llm_finetune', status: 'running', progress: 34, created_at: '2026-03-05T06:00:00Z', started_at: '2026-03-05T06:05:00Z' },
  { id: '3', name: 'Genetic Strategy Search', type: 'genetic', status: 'paused', progress: 82, created_at: '2026-03-04T12:00:00Z', started_at: '2026-03-04T12:10:00Z' },
  { id: '4', name: 'DQN ETH Strategy', type: 'rl_dqn', status: 'completed', progress: 100, created_at: '2026-03-03T09:00:00Z', completed_at: '2026-03-03T18:00:00Z' },
  { id: '5', name: 'PPO BTC v2 (baseline)', type: 'rl_ppo', status: 'failed', progress: 45, created_at: '2026-03-02T10:00:00Z' },
  { id: '6', name: 'SAC Multi-Asset', type: 'rl_sac', status: 'pending', progress: 0, created_at: '2026-03-05T12:00:00Z' },
  { id: '7', name: 'Backtest RSI Strategy', type: 'backtest', status: 'completed', progress: 100, created_at: '2026-03-01T14:00:00Z' },
];

const TYPE_LABELS: Record<string, string> = {
  rl_ppo: 'RL-PPO', rl_dqn: 'RL-DQN', rl_sac: 'RL-SAC',
  llm_finetune: 'LLM Fine-tune', genetic: 'Genetic', backtest: 'Backtest',
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running': return <Play size={12} />;
    case 'paused': return <Pause size={12} />;
    case 'completed': return <CheckCircle2 size={12} />;
    case 'failed': return <XCircle size={12} />;
    case 'pending': return <Clock size={12} />;
    case 'queued': return <Loader2 size={12} className="animate-spin" />;
    default: return <Loader2 size={12} />;
  }
}

export default function TrainingPage() {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    trainingJobsApi.list().then(d => { if (d.jobs?.length) setJobs(d.jobs); }).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'start') await trainingJobsApi.start(id);
      else if (action === 'pause') await trainingJobsApi.pause(id);
      else if (action === 'resume') await trainingJobsApi.resume(id);
      else if (action === 'stop') await trainingJobsApi.stop(id);
      else if (action === 'delete') await trainingJobsApi.delete(id);
      // Refresh
      const data = await trainingJobsApi.list();
      if (data.jobs?.length) setJobs(data.jobs);
    } catch { /* API not available */ }
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Training Jobs</h1>
            <p>Manage and monitor all training runs</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Training Job
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {['all', 'running', 'paused', 'pending', 'completed', 'failed'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f} {f !== 'all' && <span style={{ opacity: 0.7 }}>({jobs.filter(j => f === 'all' || j.status === f).length})</span>}
            </button>
          ))}
        </div>

        {/* Jobs Table */}
        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Created</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(job => (
                <tr key={job.id}>
                  <td>
                    <Link href={`/training/${job.id}`} style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      {job.name}
                    </Link>
                  </td>
                  <td><span style={{ color: 'var(--text-accent)', fontSize: '13px' }}>{TYPE_LABELS[job.type] || job.type}</span></td>
                  <td>
                    <span className={`badge badge-${job.status}`}>
                      <StatusIcon status={job.status} />
                      {job.status}
                    </span>
                  </td>
                  <td style={{ width: '160px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className={`progress-bar-fill ${job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : ''}`}
                          style={{ width: `${job.progress}%` }} />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '35px' }}>{job.progress}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {job.status === 'pending' && (
                        <button className="btn-icon" title="Start" onClick={() => handleAction(job.id, 'start')}><Play size={14} /></button>
                      )}
                      {job.status === 'running' && (
                        <button className="btn-icon" title="Pause" onClick={() => handleAction(job.id, 'pause')}><Pause size={14} /></button>
                      )}
                      {job.status === 'paused' && (
                        <button className="btn-icon" title="Resume" onClick={() => handleAction(job.id, 'resume')}><Play size={14} /></button>
                      )}
                      {['running', 'paused'].includes(job.status) && (
                        <button className="btn-icon" title="Stop" onClick={() => handleAction(job.id, 'stop')}><Square size={14} /></button>
                      )}
                      {['completed', 'failed', 'cancelled', 'pending'].includes(job.status) && (
                        <button className="btn-icon" title="Delete" onClick={() => handleAction(job.id, 'delete')}><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔬</div>
            <h3>No training jobs found</h3>
            <p>Create a new training job to get started</p>
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      {showCreate && <CreateJobModal onClose={() => setShowCreate(false)} />}
    </>
  );
}

function CreateJobModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('rl_ppo');
  const [template, setTemplate] = useState('quick_test');

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await trainingJobsApi.create({ name, type, config: { template } });
      onClose();
      window.location.reload();
    } catch { onClose(); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>New Training Job</h2>
          <button className="btn-icon" onClick={onClose}><XCircle size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Job Name</label>
            <input className="form-input" placeholder="e.g. PPO BTC Strategy v4" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Training Type</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
              <option value="rl_ppo">RL — PPO (Proximal Policy Optimization)</option>
              <option value="rl_dqn">RL — DQN (Deep Q-Network)</option>
              <option value="rl_sac">RL — SAC (Soft Actor-Critic)</option>
              <option value="llm_finetune">LLM Fine-tuning (Ollama)</option>
              <option value="genetic">Genetic Strategy Evolution</option>
              <option value="backtest">Backtest Only</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Template</label>
            <select className="form-select" value={template} onChange={e => setTemplate(e.target.value)}>
              <option value="quick_test">Quick Test — 10K steps, fast validation</option>
              <option value="full_train">Full Training — 1M steps, production quality</option>
              <option value="custom">Custom Configuration</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim()}>Create Job</button>
        </div>
      </div>
    </div>
  );
}
