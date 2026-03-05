-- PostgreSQL initialization: Training platform metadata

-- Training job status enum
CREATE TYPE training_status AS ENUM (
    'pending', 'queued', 'running', 'paused',
    'completed', 'failed', 'cancelled'
);

-- Training type enum
CREATE TYPE training_type AS ENUM (
    'rl_ppo', 'rl_dqn', 'rl_sac',
    'llm_finetune', 'genetic', 'backtest'
);

-- Model status enum
CREATE TYPE model_status AS ENUM (
    'draft', 'training', 'validated', 'deployed', 'archived'
);

-- ─── Models ───
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    type training_type NOT NULL,
    description TEXT,
    status model_status NOT NULL DEFAULT 'draft',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Model Versions ───
CREATE TABLE IF NOT EXISTS model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    model_id UUID NOT NULL REFERENCES models (id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    checkpoint_path VARCHAR(512),
    metrics JSONB DEFAULT '{}',
    is_deployed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (model_id, version)
);

-- ─── Training Jobs ───
CREATE TABLE IF NOT EXISTS training_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    type training_type NOT NULL,
    status training_status NOT NULL DEFAULT 'pending',
    model_id UUID REFERENCES models (id),
    config JSONB NOT NULL DEFAULT '{}',
    result JSONB DEFAULT '{}',
    progress REAL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Training Metrics (time-series) ───
CREATE TABLE IF NOT EXISTS training_metrics (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES training_jobs (id) ON DELETE CASCADE,
    step INTEGER NOT NULL,
    epoch INTEGER,
    loss REAL,
    reward REAL,
    win_rate REAL,
    sharpe_ratio REAL,
    max_drawdown REAL,
    portfolio_value REAL,
    extra JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_job_step ON training_metrics (job_id, step);

-- ─── Training Configs (templates) ───
CREATE TABLE IF NOT EXISTS training_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL UNIQUE,
    type training_type NOT NULL,
    config JSONB NOT NULL,
    description TEXT,
    is_template BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Datasets ───
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    symbols JSONB NOT NULL DEFAULT '[]',
    timeframe VARCHAR(10) NOT NULL DEFAULT '1h',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    row_count BIGINT DEFAULT 0,
    feature_config JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'building',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Seed default config templates ───
INSERT INTO
    training_configs (
        name,
        type,
        config,
        description
    )
VALUES (
        'RL Quick Test',
        'rl_ppo',
        '{"total_timesteps": 10000, "learning_rate": 0.0003, "batch_size": 64, "n_epochs": 10, "gamma": 0.99, "network": "small"}',
        'Fast PPO test run — 10K steps, small network'
    ),
    (
        'RL Full Training',
        'rl_ppo',
        '{"total_timesteps": 1000000, "learning_rate": 0.0001, "batch_size": 256, "n_epochs": 20, "gamma": 0.995, "network": "large"}',
        'Full PPO training — 1M steps, large network'
    ),
    (
        'DQN Standard',
        'rl_dqn',
        '{"total_timesteps": 500000, "learning_rate": 0.0005, "batch_size": 128, "buffer_size": 100000, "exploration_fraction": 0.2}',
        'Standard DQN training with experience replay'
    ),
    (
        'LLM Market Reasoning',
        'llm_finetune',
        '{"base_model": "llama3", "epochs": 3, "dataset_size": 5000, "prompt_template": "market_reasoning"}',
        'Fine-tune LLM for market analysis reasoning'
    ),
    (
        'Genetic Strategy Search',
        'genetic',
        '{"population_size": 500, "generations": 50, "mutation_rate": 0.1, "crossover_rate": 0.7, "elite_ratio": 0.1}',
        'Genetic algorithm strategy exploration — 500 strategies, 50 generations'
    ) ON CONFLICT (name) DO NOTHING;