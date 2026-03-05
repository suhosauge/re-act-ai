// ─── Training Status ───
export type TrainingStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

// ─── Training Type ───
export type TrainingType =
  | 'rl_ppo'
  | 'rl_dqn'
  | 'rl_sac'
  | 'llm_finetune'
  | 'genetic'
  | 'backtest';

// ─── Training Config ───
export interface TrainingConfig {
  // RL configs
  total_timesteps?: number;
  learning_rate?: number;
  batch_size?: number;
  n_epochs?: number;
  gamma?: number;
  network?: 'small' | 'medium' | 'large';
  buffer_size?: number;
  exploration_fraction?: number;

  // LLM fine-tune configs
  base_model?: string;
  epochs?: number;
  dataset_size?: number;
  prompt_template?: string;

  // Genetic configs
  population_size?: number;
  generations?: number;
  mutation_rate?: number;
  crossover_rate?: number;
  elite_ratio?: number;

  // Dataset binding
  dataset_id?: string;
  symbols?: string[];
  timeframe?: string;
  reward_function?: 'pnl' | 'sharpe' | 'drawdown_penalty' | 'composite';

  // Extra
  [key: string]: unknown;
}

// ─── Training Metric ───
export interface TrainingMetric {
  id?: number;
  job_id: string;
  step: number;
  epoch?: number;
  loss?: number;
  reward?: number;
  win_rate?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  portfolio_value?: number;
  extra?: Record<string, unknown>;
  recorded_at: string;
}

// ─── Training Job ───
export interface TrainingJob {
  id: string;
  name: string;
  type: TrainingType;
  status: TrainingStatus;
  model_id?: string;
  config: TrainingConfig;
  result?: Record<string, unknown>;
  progress: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Training Config Template ───
export interface TrainingConfigTemplate {
  id: string;
  name: string;
  type: TrainingType;
  config: TrainingConfig;
  description?: string;
  is_template: boolean;
  created_at: string;
}

// ─── Valid Status Transitions ───
export const VALID_TRANSITIONS: Record<TrainingStatus, TrainingStatus[]> = {
  pending:   ['queued', 'cancelled'],
  queued:    ['running', 'cancelled'],
  running:   ['paused', 'completed', 'failed', 'cancelled'],
  paused:    ['running', 'cancelled'],
  completed: [],
  failed:    ['queued'],   // allow retry
  cancelled: ['queued'],   // allow re-queue
};
