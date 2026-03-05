'use client';

import { useState } from 'react';
import {
  Radio, TrendingUp, TrendingDown, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Mock live data
const MOCK_DECISIONS = [
  { time: '14:05:23', symbol: 'BTCUSDT', action: 'BUY', confidence: 0.84, price: 67234.50, result: null },
  { time: '14:00:12', symbol: 'BTCUSDT', action: 'HOLD', confidence: 0.45, price: 67180.00, result: null },
  { time: '13:55:01', symbol: 'ETHUSDT', action: 'SELL', confidence: 0.72, price: 3456.78, result: '+1.2%' },
  { time: '13:50:44', symbol: 'BTCUSDT', action: 'HOLD', confidence: 0.38, price: 67050.00, result: null },
  { time: '13:45:33', symbol: 'ETHUSDT', action: 'BUY', confidence: 0.68, price: 3412.30, result: null },
  { time: '13:40:15', symbol: 'BTCUSDT', action: 'SELL', confidence: 0.76, price: 66890.00, result: '+0.8%' },
  { time: '13:35:02', symbol: 'SOLUSDT', action: 'BUY', confidence: 0.62, price: 142.55, result: '+2.1%' },
];

const MOCK_EQUITY = Array.from({ length: 60 }, (_, i) => ({
  time: `${Math.floor(i / 60 + 13)}:${String(i % 60).padStart(2, '0')}`,
  value: 10000 + Math.sin(i * 0.1) * 200 + i * 5 + (Math.random() - 0.4) * 50,
}));

const ACTION_STYLES: Record<string, { color: string; icon: any }> = {
  BUY: { color: 'var(--accent-emerald)', icon: ArrowUpRight },
  SELL: { color: 'var(--accent-rose)', icon: ArrowDownRight },
  HOLD: { color: 'var(--text-muted)', icon: Minus },
  SHORT: { color: 'var(--accent-amber)', icon: ArrowDownRight },
};

export default function LivePage() {
  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Live Agent Monitor</h1>
            <p>Real-time trading decisions and portfolio tracking</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot connected" />
            <span style={{ fontSize: '13px', color: 'var(--accent-emerald)', fontWeight: 600 }}>Agent Active</span>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '28px' }}>
          <div className="glass-card stat-card emerald">
            <div className="stat-card-header">
              <span className="stat-card-label">Portfolio Value</span>
              <div className="stat-card-icon emerald"><DollarSign size={18} /></div>
            </div>
            <div className="stat-card-value" style={{ fontSize: '28px' }}>$10,342</div>
            <div className="stat-card-change positive">+3.42% today</div>
          </div>
          <div className="glass-card stat-card indigo">
            <div className="stat-card-header">
              <span className="stat-card-label">Decisions Today</span>
              <div className="stat-card-icon indigo"><Activity size={18} /></div>
            </div>
            <div className="stat-card-value" style={{ fontSize: '28px' }}>47</div>
            <div className="stat-card-change">32 HOLD · 8 BUY · 7 SELL</div>
          </div>
          <div className="glass-card stat-card amber">
            <div className="stat-card-header">
              <span className="stat-card-label">Win Rate</span>
              <div className="stat-card-icon amber"><TrendingUp size={18} /></div>
            </div>
            <div className="stat-card-value" style={{ fontSize: '28px' }}>64%</div>
            <div className="stat-card-change positive">+2% vs yesterday</div>
          </div>
          <div className="glass-card stat-card rose">
            <div className="stat-card-header">
              <span className="stat-card-label">Model</span>
              <div className="stat-card-icon rose"><Radio size={18} /></div>
            </div>
            <div className="stat-card-value" style={{ fontSize: '18px' }}>PPO BTC v3</div>
            <div className="stat-card-change">Sharpe: 1.82</div>
          </div>
        </div>

        {/* Chart + Decisions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
          <div className="glass-card chart-container">
            <div className="chart-header"><span className="chart-title">Portfolio Equity (Live)</span></div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={MOCK_EQUITY}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#eqGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card" style={{ padding: '20px', maxHeight: '420px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Recent Decisions</h3>
            {MOCK_DECISIONS.map((d, i) => {
              const style = ACTION_STYLES[d.action] || ACTION_STYLES.HOLD;
              const Icon = style.icon;
              return (
                <div key={i} style={{
                  padding: '12px 0',
                  borderBottom: i < MOCK_DECISIONS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={14} style={{ color: style.color }} />
                      <span style={{ fontWeight: 700, color: style.color, fontSize: '13px' }}>{d.action}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{d.symbol}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>${d.price.toLocaleString()}</span>
                    <span>conf: {(d.confidence * 100).toFixed(0)}%</span>
                    {d.result && <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{d.result}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
