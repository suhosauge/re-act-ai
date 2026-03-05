'use client';

import { useState, useEffect, use } from 'react';
import {
  ArrowLeft, Play, Pause, Square, RotateCcw,
  TrendingUp, TrendingDown, Target, BarChart3,
  Clock, Zap, Activity
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { trainingJobsApi } from '@/lib/api';
import { useWebSocket } from '@/hooks/use-websocket';

// Mock metric data for demo
function generateMockMetrics(steps: number) {
  const data = [];
  let loss = 2.5, reward = -1, winRate = 0.3, equity = 10000, sharpe = 0;
  for (let i = 0; i < steps; i++) {
    loss = Math.max(0.1, loss - 0.003 + (Math.random() - 0.5) * 0.1);
    reward = reward + 0.01 + (Math.random() - 0.4) * 0.2;
    winRate = Math.min(0.8, Math.max(0.2, winRate + (Math.random() - 0.45) * 0.02));
    equity = equity * (1 + (Math.random() - 0.45) * 0.005);
    sharpe = (reward / Math.max(0.5, Math.abs(reward) * 0.3));
    data.push({
      step: i * 1000,
      loss: +loss.toFixed(4),
      reward: +reward.toFixed(3),
      win_rate: +(winRate * 100).toFixed(1),
      portfolio_value: +equity.toFixed(2),
      sharpe_ratio: +sharpe.toFixed(3),
    });
  }
  return data;
}

const MOCK_JOB = {
  id: '1', name: 'PPO BTC Momentum v3', type: 'rl_ppo', status: 'running',
  progress: 67, config: { total_timesteps: 1000000, learning_rate: 0.0003, batch_size: 64, reward_function: 'composite' },
  started_at: '2026-03-05T08:01:00Z', created_at: '2026-03-05T08:00:00Z',
};

const chartTheme = {
  bg: 'transparent',
  grid: 'rgba(255,255,255,0.05)',
  text: '#64748b',
  loss: '#f43f5e',
  reward: '#10b981',
  winRate: '#6366f1',
  equity: '#06b6d4',
  sharpe: '#8b5cf6',
};

export default function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState(MOCK_JOB);
  const [metrics, setMetrics] = useState(() => generateMockMetrics(100));
  const { connected, subscribe, onMessage } = useWebSocket();

  useEffect(() => {
    trainingJobsApi.get(id).then(setJob).catch(() => {});
    trainingJobsApi.metrics(id).then(m => { if (m?.length) setMetrics(m); }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (connected) {
      subscribe(id);
      return onMessage('metric', (msg) => {
        if (msg.jobId === id && msg.data) {
          setMetrics(prev => [...prev.slice(-199), msg.data]);
        }
      });
    }
  }, [connected, id, subscribe, onMessage]);

  const latest = metrics[metrics.length - 1] || {};

  const handleAction = async (action: string) => {
    try {
      if (action === 'pause') { const j = await trainingJobsApi.pause(id); setJob(j); }
      else if (action === 'resume') { const j = await trainingJobsApi.resume(id); setJob(j); }
      else if (action === 'stop') { const j = await trainingJobsApi.stop(id); setJob(j); }
    } catch {}
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/training" className="btn-icon"><ArrowLeft size={18} /></Link>
            <div>
              <h1>{job.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <span className={`badge badge-${job.status}`}>{job.status}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {job.type.replace('_', '-').toUpperCase()}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Progress: {job.progress}%
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {job.status === 'running' && (
              <button className="btn btn-ghost btn-sm" onClick={() => handleAction('pause')}><Pause size={14} /> Pause</button>
            )}
            {job.status === 'paused' && (
              <button className="btn btn-success btn-sm" onClick={() => handleAction('resume')}><Play size={14} /> Resume</button>
            )}
            {['running', 'paused'].includes(job.status) && (
              <button className="btn btn-danger btn-sm" onClick={() => handleAction('stop')}><Square size={14} /> Stop</button>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Key Metrics Strip */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '28px' }}>
          {[
            { label: 'Loss', value: latest.loss?.toFixed(4) || '—', icon: TrendingDown, color: 'rose' },
            { label: 'Avg Reward', value: latest.reward?.toFixed(3) || '—', icon: Zap, color: 'emerald' },
            { label: 'Win Rate', value: latest.win_rate ? `${latest.win_rate}%` : '—', icon: Target, color: 'indigo' },
            { label: 'Portfolio', value: latest.portfolio_value ? `$${latest.portfolio_value.toLocaleString()}` : '—', icon: BarChart3, color: 'amber' },
            { label: 'Sharpe', value: latest.sharpe_ratio?.toFixed(3) || '—', icon: Activity, color: 'indigo' },
          ].map(m => {
            const Icon = m.icon;
            return (
              <div key={m.label} className={`glass-card stat-card ${m.color}`}>
                <div className="stat-card-header">
                  <span className="stat-card-label">{m.label}</span>
                  <div className={`stat-card-icon ${m.color}`}><Icon size={18} /></div>
                </div>
                <div className="stat-card-value" style={{ fontSize: '24px' }}>{m.value}</div>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          {/* Loss Chart */}
          <div className="glass-card chart-container">
            <div className="chart-header">
              <span className="chart-title">Training Loss</span>
              <TrendingDown size={16} style={{ color: chartTheme.loss }} />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartTheme.loss} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartTheme.loss} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} />
                <XAxis dataKey="step" tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="loss" stroke={chartTheme.loss} fill="url(#lossGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Reward Chart */}
          <div className="glass-card chart-container">
            <div className="chart-header">
              <span className="chart-title">Average Reward</span>
              <TrendingUp size={16} style={{ color: chartTheme.reward }} />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="rewardGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartTheme.reward} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartTheme.reward} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} />
                <XAxis dataKey="step" tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="reward" stroke={chartTheme.reward} fill="url(#rewardGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Win Rate Chart */}
          <div className="glass-card chart-container">
            <div className="chart-header">
              <span className="chart-title">Win Rate (%)</span>
              <Target size={16} style={{ color: chartTheme.winRate }} />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={metrics}>
                <CartesianGrid stroke={chartTheme.grid} />
                <XAxis dataKey="step" tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                <Line type="monotone" dataKey="win_rate" stroke={chartTheme.winRate} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Portfolio Equity */}
          <div className="glass-card chart-container">
            <div className="chart-header">
              <span className="chart-title">Portfolio Value ($)</span>
              <BarChart3 size={16} style={{ color: chartTheme.equity }} />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartTheme.equity} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartTheme.equity} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} />
                <XAxis dataKey="step" tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="portfolio_value" stroke={chartTheme.equity} fill="url(#equityGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Config Panel */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {Object.entries(job.config || {}).map(([key, val]) => (
              <div key={key}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
