'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Box,
  Clock,
  TrendingUp,
  Activity,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Server,
  Database,
  HardDrive,
} from 'lucide-react';
import { systemApi, trainingJobsApi } from '@/lib/api';

// ─── Mock data for initial UI (replaced by API when backend runs) ───
const MOCK_STATS = {
  activeJobs: 3,
  modelsDeployed: 2,
  totalHours: 142,
  bestSharpe: 1.82,
};

const MOCK_JOBS = [
  { id: '1', name: 'PPO BTC Momentum v3', type: 'rl_ppo', status: 'running', progress: 67, config: {} },
  { id: '2', name: 'LLM Market Reasoning', type: 'llm_finetune', status: 'running', progress: 34, config: {} },
  { id: '3', name: 'Genetic Strategy Search', type: 'genetic', status: 'paused', progress: 82, config: {} },
  { id: '4', name: 'DQN ETH Strategy', type: 'rl_dqn', status: 'completed', progress: 100, config: {} },
  { id: '5', name: 'PPO BTC v2 (baseline)', type: 'rl_ppo', status: 'failed', progress: 45, config: {} },
];

const MOCK_ACTIVITY = [
  { time: '2 min ago', text: 'PPO BTC v3 reached step 670K — reward: +4.2', type: 'metric' },
  { time: '15 min ago', text: 'LLM Market Reasoning started epoch 2/3', type: 'info' },
  { time: '1 hour ago', text: 'DQN ETH Strategy completed — Sharpe: 1.45', type: 'success' },
  { time: '2 hours ago', text: 'PPO BTC v2 failed — CUDA out of memory', type: 'error' },
  { time: '3 hours ago', text: 'Genetic Search paused at generation 41/50', type: 'warning' },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running': return <Play size={14} />;
    case 'paused': return <Pause size={14} />;
    case 'completed': return <CheckCircle2 size={14} />;
    case 'failed': return <XCircle size={14} />;
    default: return <Loader2 size={14} className="animate-spin" />;
  }
}

function TypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    rl_ppo: 'RL-PPO',
    rl_dqn: 'RL-DQN',
    rl_sac: 'RL-SAC',
    llm_finetune: 'LLM Fine-tune',
    genetic: 'Genetic',
    backtest: 'Backtest',
  };
  return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{labels[type] || type}</span>;
}

export default function DashboardPage() {
  const [services, setServices] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [stats] = useState(MOCK_STATS);

  useEffect(() => {
    // Try to fetch real data, fall back to mock
    systemApi.status()
      .then((data) => setServices(data.services || {}))
      .catch(() => setServices({
        postgres: 'unknown', ollama: 'unknown', qdrant: 'unknown', clickhouse: 'unknown'
      }));

    trainingJobsApi.list()
      .then((data) => { if (data.jobs?.length) setJobs(data.jobs); })
      .catch(() => {}); // keep mock data
  }, []);

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Dashboard</h1>
            <p>AI Training Platform — Overview</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <Activity size={14} />
            <span>System Online</span>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid animate-fade-in">
          <div className="glass-card stat-card indigo">
            <div className="stat-card-header">
              <span className="stat-card-label">Active Jobs</span>
              <div className="stat-card-icon indigo"><Brain size={20} /></div>
            </div>
            <div className="stat-card-value">{stats.activeJobs}</div>
            <div className="stat-card-change positive">+1 from yesterday</div>
          </div>

          <div className="glass-card stat-card emerald">
            <div className="stat-card-header">
              <span className="stat-card-label">Models Deployed</span>
              <div className="stat-card-icon emerald"><Box size={20} /></div>
            </div>
            <div className="stat-card-value">{stats.modelsDeployed}</div>
            <div className="stat-card-change positive">2 validated</div>
          </div>

          <div className="glass-card stat-card amber">
            <div className="stat-card-header">
              <span className="stat-card-label">Training Hours</span>
              <div className="stat-card-icon amber"><Clock size={20} /></div>
            </div>
            <div className="stat-card-value">{stats.totalHours}h</div>
            <div className="stat-card-change positive">+18h this week</div>
          </div>

          <div className="glass-card stat-card rose">
            <div className="stat-card-header">
              <span className="stat-card-label">Best Sharpe Ratio</span>
              <div className="stat-card-icon rose"><TrendingUp size={20} /></div>
            </div>
            <div className="stat-card-value">{stats.bestSharpe}</div>
            <div className="stat-card-change positive">PPO BTC v3</div>
          </div>
        </div>

        {/* Main content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
          {/* Active Jobs */}
          <div className="section animate-slide-in">
            <div className="section-header">
              <h2 className="section-title">Training Jobs</h2>
              <a href="/training" className="btn btn-ghost btn-sm">View All</a>
            </div>
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.slice(0, 5).map((job) => (
                    <tr key={job.id}>
                      <td>
                        <a href={`/training/${job.id}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {job.name}
                        </a>
                      </td>
                      <td><TypeLabel type={job.type} /></td>
                      <td>
                        <span className={`badge badge-${job.status}`}>
                          <StatusIcon status={job.status} />
                          {job.status}
                        </span>
                      </td>
                      <td style={{ width: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div
                              className={`progress-bar-fill ${job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : ''}`}
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '32px' }}>
                            {job.progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Activity + System Health */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Activity */}
            <div className="section animate-slide-in">
              <div className="section-header">
                <h2 className="section-title">Activity</h2>
              </div>
              <div className="glass-card" style={{ padding: '16px' }}>
                {MOCK_ACTIVITY.map((item, i) => (
                  <div key={i} style={{
                    padding: '10px 0',
                    borderBottom: i < MOCK_ACTIVITY.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      marginTop: '7px',
                      flexShrink: 0,
                      background: item.type === 'success' ? 'var(--accent-emerald)'
                        : item.type === 'error' ? 'var(--accent-rose)'
                        : item.type === 'warning' ? 'var(--accent-amber)'
                        : 'var(--accent-indigo)',
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{item.text}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div className="section animate-slide-in">
              <div className="section-header">
                <h2 className="section-title">System Health</h2>
              </div>
              <div className="glass-card" style={{ padding: '16px' }}>
                {[
                  { name: 'PostgreSQL', key: 'postgres', icon: Database },
                  { name: 'Ollama', key: 'ollama', icon: Zap },
                  { name: 'Qdrant', key: 'qdrant', icon: HardDrive },
                  { name: 'ClickHouse', key: 'clickhouse', icon: Server },
                ].map((svc) => {
                  const Icon = svc.icon;
                  const status = services[svc.key] || 'unknown';
                  return (
                    <div key={svc.key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={16} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{svc.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`status-dot ${status}`} />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
