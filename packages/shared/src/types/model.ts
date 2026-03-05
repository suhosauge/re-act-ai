// ─── Model Status ───
export type ModelStatus = 'draft' | 'training' | 'validated' | 'deployed' | 'archived';

// ─── Model ───
export interface Model {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: ModelStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ─── Model Version ───
export interface ModelVersion {
  id: string;
  model_id: string;
  version: number;
  checkpoint_path?: string;
  metrics: ModelMetricsSnapshot;
  is_deployed: boolean;
  created_at: string;
}

// ─── Model Metrics Snapshot ───
export interface ModelMetricsSnapshot {
  total_return?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  win_rate?: number;
  profit_factor?: number;
  total_trades?: number;
  avg_trade_duration?: number;
  [key: string]: unknown;
}
