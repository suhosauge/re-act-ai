'use client';

import { useState } from 'react';
import { ArrowLeft, Rocket, Archive, CheckCircle2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

const MOCK_VERSIONS = [
  { id: 'v1', version: 1, is_deployed: false, created_at: '2026-02-15T10:00:00Z', metrics: { total_return: 8.2, sharpe_ratio: 1.05, max_drawdown: -12.3, win_rate: 52, profit_factor: 1.2, total_trades: 340 } },
  { id: 'v2', version: 2, is_deployed: false, created_at: '2026-02-28T14:00:00Z', metrics: { total_return: 14.1, sharpe_ratio: 1.45, max_drawdown: -8.1, win_rate: 57, profit_factor: 1.5, total_trades: 410 } },
  { id: 'v3', version: 3, is_deployed: true, created_at: '2026-03-05T08:00:00Z', metrics: { total_return: 18.4, sharpe_ratio: 1.82, max_drawdown: -5.3, win_rate: 61, profit_factor: 1.7, total_trades: 520 } },
];

const radarData = [
  { metric: 'Return', v1: 45, v2: 70, v3: 92 },
  { metric: 'Sharpe', v1: 53, v2: 72, v3: 91 },
  { metric: 'Win Rate', v1: 52, v2: 57, v3: 61 },
  { metric: 'Profit Factor', v1: 60, v2: 75, v3: 85 },
  { metric: 'Drawdown', v1: 38, v2: 58, v3: 82 },
];

const comparisonData = MOCK_VERSIONS.map(v => ({
  version: `v${v.version}`,
  return: v.metrics.total_return,
  sharpe: v.metrics.sharpe_ratio,
  drawdown: Math.abs(v.metrics.max_drawdown),
}));

export default function ModelDetailPage() {
  const [versions] = useState(MOCK_VERSIONS);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/models" className="btn-icon"><ArrowLeft size={18} /></Link>
          <div>
            <h1>PPO BTC Momentum</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <span className="badge badge-running" style={{ background: 'var(--accent-emerald-glow)', color: 'var(--accent-emerald)' }}>
                <Rocket size={12} /> Deployed
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>RL-PPO · 3 versions</span>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Version Comparison Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          <div className="glass-card chart-container">
            <div className="chart-header"><span className="chart-title">Version Comparison — Radar</span></div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis tick={false} domain={[0, 100]} />
                <Radar name="v1" dataKey="v1" stroke="#64748b" fill="#64748b" fillOpacity={0.1} />
                <Radar name="v2" dataKey="v2" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                <Radar name="v3" dataKey="v3" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card chart-container">
            <div className="chart-header"><span className="chart-title">Metrics by Version</span></div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="version" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="return" fill="#10b981" name="Return %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sharpe" fill="#6366f1" name="Sharpe" radius={[4, 4, 0, 0]} />
                <Bar dataKey="drawdown" fill="#f43f5e" name="Drawdown %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Versions Table */}
        <div className="section">
          <div className="section-header"><h2 className="section-title">Versions</h2></div>
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Version</th><th>Return</th><th>Sharpe</th><th>Drawdown</th>
                  <th>Win Rate</th><th>Trades</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700 }}>v{v.version}</td>
                    <td style={{ color: v.metrics.total_return > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
                      {v.metrics.total_return > 0 ? '+' : ''}{v.metrics.total_return}%
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.metrics.sharpe_ratio}</td>
                    <td style={{ color: 'var(--accent-rose)' }}>{v.metrics.max_drawdown}%</td>
                    <td>{v.metrics.win_rate}%</td>
                    <td>{v.metrics.total_trades}</td>
                    <td>
                      {v.is_deployed ? (
                        <span className="badge badge-running"><Rocket size={10} />Deployed</span>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {!v.is_deployed && (
                        <button className="btn btn-sm btn-ghost"><Rocket size={12} /> Deploy</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
