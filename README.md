# 🚀 AI Training Platform (ATP)

A self-learning crypto trading platform with full lifecycle management — from market data ingestion to RL/LLM training to live agent deployment.

## Architecture

```
Dashboard UI (Next.js) → REST/WebSocket API (Express) → Training Core (Python)
                              ↕                              ↕
                         PostgreSQL                    Gymnasium Env
                         Redis pub/sub                 Stable-Baselines3
                         Kafka commands                Ollama LLM
                                                       Qdrant Memory
                                                       ClickHouse Data
```

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install

# 3. Start API server
cd packages/api && npx tsx src/server.ts

# 4. Start Dashboard UI
cd packages/ui && npm run dev

# 5. Start Training Worker (Python)
cd packages/training && pip install -e . && python -m src.workers.training_worker
```

Open http://localhost:3000 for the dashboard.

## Project Structure

```
re-act-ai/
├── docs/                       # Architecture & module documentation
│   ├── architecture/           # High-level design, tech stack
│   └── modules/                # 10 module-specific docs
├── infra/                      # Database init scripts
│   ├── init-clickhouse.sql     # Market data tables
│   └── init-postgres.sql       # Training metadata + seeds
├── packages/
│   ├── api/                    # Express REST API + WebSocket
│   │   ├── src/
│   │   │   ├── db/             # PostgreSQL connection
│   │   │   ├── routes/         # training-jobs, models, datasets
│   │   │   ├── services/       # Business logic
│   │   │   ├── ws/             # WebSocket server
│   │   │   └── server.ts       # Entry point
│   │   └── Dockerfile
│   ├── shared/                 # TypeScript types
│   │   └── src/types/          # training, model, market
│   ├── training/               # Python ML package
│   │   ├── src/
│   │   │   ├── data/           # Collector, ClickHouse writer
│   │   │   ├── features/       # 12 indicators + pipeline
│   │   │   ├── simulation/     # Gymnasium MarketEnv
│   │   │   ├── trainers/       # RL (PPO/DQN/SAC), LLM fine-tuner
│   │   │   ├── workers/        # Kafka training worker
│   │   │   └── memory/         # Qdrant experience store
│   │   └── Dockerfile
│   └── ui/                     # Next.js Dashboard
│       ├── src/app/            # Pages (dashboard, training, models, datasets, live, settings)
│       ├── src/components/     # Sidebar, charts
│       ├── src/hooks/          # WebSocket hook
│       ├── src/lib/            # API client
│       └── Dockerfile
├── docker-compose.yml          # Full stack services
├── package.json                # Monorepo root
└── tsconfig.json               # Root TypeScript config
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Dashboard UI | 3000 | Training management interface |
| API Server | 3001 | REST + WebSocket gateway |
| PostgreSQL | 5432 | Training metadata |
| ClickHouse | 8123 | Market time-series data |
| Qdrant | 6333 | Experience memory vectors |
| Ollama | 11434 | LLM inference + fine-tuning |
| Kafka | 9092 | Event streaming |
| Redis | 6379 | Cache + pub/sub |

## Dashboard Pages

| Page | Features |
|------|----------|
| **Dashboard** | Stats cards, active jobs, activity feed, system health |
| **Training Jobs** | Create/manage jobs, lifecycle controls, progress tracking |
| **Job Detail** | 4 live charts (loss, reward, win rate, equity), config view |
| **Models** | Model cards with metrics, status badges, tags |
| **Model Detail** | Radar chart comparison, bar metrics, version deploy |
| **Datasets** | Dataset cards, create wizard, symbol/timeframe config |
| **Live Agent** | Equity curve, decision feed, portfolio stats |
| **Settings** | Service connections, training defaults |

## Training Types

| Type | Framework | Description |
|------|-----------|-------------|
| RL-PPO | Stable-Baselines3 | Proximal Policy Optimization |
| RL-DQN | Stable-Baselines3 | Deep Q-Network |
| RL-SAC | Stable-Baselines3 | Soft Actor-Critic |
| LLM Fine-tune | Ollama | Market reasoning fine-tuning |
| Genetic | Custom | Strategy evolution |

## Documentation

See `docs/` for comprehensive module documentation:
- `docs/architecture/overview.md` — System design
- `docs/architecture/tech-stack.md` — Technology decisions
- `docs/modules/*/README.md` — Per-module design, tasks, verification
