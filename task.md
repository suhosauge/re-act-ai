# AI Training Platform — Master Task Tracker

## Phase 0: Documentation & Planning
- [x] Analyze [idea.md](file:///home/nhhien/workspaces-ai/re-act-ai/idea.md) and define scope
- [x] Create implementation plan ([implementation_plan.md](file:///home/nhhien/.gemini/antigravity/brain/78b913da-b637-4946-8f7d-3d71481cb342/implementation_plan.md))
- [x] Create architecture overview ([docs/architecture/overview.md](file:///home/nhhien/workspaces-ai/re-act-ai/docs/architecture/overview.md))
- [x] Create tech stack decisions ([docs/architecture/tech-stack.md](file:///home/nhhien/workspaces-ai/re-act-ai/docs/architecture/tech-stack.md))
- [x] Module doc: Infrastructure (`docs/modules/infrastructure/`)
- [x] Module doc: Data Pipeline (`docs/modules/data-pipeline/`)
- [x] Module doc: Feature Engine (`docs/modules/feature-engine/`)
- [x] Module doc: Simulation (`docs/modules/simulation/`)
- [x] Module doc: Training Core (`docs/modules/training-core/`)
- [x] Module doc: Memory System (`docs/modules/memory-system/`)
- [x] Module doc: Agent Runtime (`docs/modules/agent-runtime/`)
- [x] Module doc: API Layer (`docs/modules/api-layer/`)
- [x] Module doc: Dashboard UI (`docs/modules/dashboard-ui/`)
- [x] Module doc: Model Registry (`docs/modules/models-registry/`)

## Phase 1: Foundation & Infrastructure (Day 1–3)
- [x] Root `package.json` (npm workspaces)
- [x] Root `tsconfig.json`
- [x] `.gitignore`
- [x] `docker-compose.yml` (Ollama, Qdrant, ClickHouse, Kafka, Redis, Postgres)
- [x] `infra/init-clickhouse.sql` (market data tables)
- [x] `infra/init-postgres.sql` (training metadata + seed configs)
- [x] Shared types: `training.ts`, `model.ts`, `market.ts`
- [x] API: `package.json`, `tsconfig.json`, `.env.example`
- [x] API: `db/index.ts` (Postgres pool)
- [x] API: `services/training-service.ts` (CRUD + state machine)
- [x] API: `services/model-service.ts` (CRUD + versioning)
- [x] API: `routes/training-jobs.ts` (REST endpoints)
- [x] API: `routes/models.ts` (REST endpoints)
- [x] API: `routes/datasets.ts` (REST endpoints)
- [x] API: `ws/training-stream.ts` (WebSocket server)
- [x] API: `server.ts` (Express entry point + health/system-status)
- [x] UI: Next.js init (user created)
- [x] UI: Install recharts, lucide-react, date-fns
- [x] UI: `globals.css` (design system)
- [x] UI: `lib/api.ts` (API client)
- [x] UI: `hooks/use-websocket.ts`
- [x] UI: `components/layout/sidebar.tsx`
- [ ] UI: `app/layout.tsx` (root layout with sidebar)
- [ ] UI: `app/page.tsx` (dashboard overview)

## Phase 2: Data Pipeline (Day 4–6)
- [ ] Python package setup (`pyproject.toml`)
- [ ] `data/collector.py` (Binance WebSocket → Kafka)
- [ ] `data/storage.py` (Kafka → ClickHouse writer)
- [ ] `data/historical_loader.py` (REST backfill)
- [ ] `data/dataset_builder.py` (episodes from ClickHouse)
- [ ] `routes/datasets.ts` (dataset management API)

## Phase 3: Feature Engine (Day 4–6)
- [ ] `features/indicators.py` (RSI, MACD, VWAP, BB, ATR, OBV)
- [ ] `features/orderbook_features.py` (imbalance, spread, depth)
- [ ] `features/feature_pipeline.py` (registry + compose + normalize)
- [ ] `features/validation.py` (NaN/Inf checks, importance)

## Phase 4: Simulation Engine (Day 7–10)
- [ ] `simulation/market_env.py` (Gymnasium env)
- [ ] `simulation/portfolio.py` (position tracking, PnL)
- [ ] `simulation/rewards.py` (PnL, Sharpe, Drawdown, Composite)

## Phase 5: Training Core (Day 7–10)
- [ ] `trainers/rl_trainer.py` (SB3 wrapper: PPO/DQN/SAC)
- [ ] `trainers/llm_finetuner.py` (Ollama fine-tuning)
- [ ] `trainers/genetic_trainer.py` (strategy evolution)
- [ ] `workers/training_worker.py` (Kafka consumer, lifecycle)
- [ ] `reporters/metrics_reporter.py` (Redis pub/sub + Postgres)
- [ ] `scheduler/scheduler.py` (priority queue, resource-aware)
- [ ] `configs/templates.py` (preset configs)
- [ ] `configs/validation.py` (Pydantic schemas)
- [ ] `evaluators/strategy_evaluator.py` (backtest runner)

## Phase 6: Dashboard UI (Day 11–15)
- [ ] Training Jobs list page
- [ ] Training Job creation wizard
- [ ] Training Job detail page (live metrics charts)
- [ ] Training logs viewer
- [ ] Model Registry list page
- [ ] Model detail + version comparison
- [ ] Pipeline builder page
- [ ] Schedule & automation UI
- [ ] Settings page
- [ ] System health dashboard
- [ ] Live agent monitor page

## Phase 7: Memory & Agent Runtime (Day 16–17)
- [ ] `memory/experience_store.py` (Qdrant CRUD)
- [ ] `agent/agent_runner.py` (live inference)
- [ ] Memory visualization UI page

## Phase 8: Integration & Deploy (Day 18–20)
- [ ] Dockerfiles (API, UI, Training Worker)
- [ ] Full stack `docker compose up` test
- [ ] K8s manifests
- [ ] `README.md` documentation
- [ ] End-to-end verification
