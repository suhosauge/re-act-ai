# Module 1: Infrastructure

## Overview
Manages all platform services via Docker Compose (dev) and Kubernetes (prod). Provides the foundation that all other modules depend on.

---

## Design

### Services Managed

| Service | Image | Ports | Storage | Purpose |
|---------|-------|-------|---------|---------|
| PostgreSQL 16 | `postgres:16-alpine` | 5432 | `postgres_data` volume | Training metadata, model registry |
| ClickHouse | `clickhouse/clickhouse-server` | 8123, 9000 | `clickhouse_data` volume | Market data time-series |
| Qdrant | `qdrant/qdrant` | 6333, 6334 | `qdrant_data` volume | Experience memory vectors |
| Ollama | `ollama/ollama` | 11434 | `ollama_data` volume | LLM inference & fine-tuning |
| Kafka | `confluentinc/cp-kafka:7.5.0` | 9092 | — | Event streaming |
| Zookeeper | `confluentinc/cp-zookeeper:7.5.0` | 2181 | — | Kafka coordination |
| Redis | `redis:7-alpine` | 6379 | `redis_data` volume | Cache, pub/sub, job queue |

### Health Checks
Every service has a health check with appropriate intervals and retries. This ensures `depends_on` with `condition: service_healthy` works correctly.

### Network Topology
```
┌─────────────────────────────────────┐
│           default network           │
│                                     │
│  postgres ─── api ─── ui            │
│  clickhouse ─── training-worker     │
│  qdrant ─── training-worker         │
│  ollama ─── training-worker         │
│  kafka ─── collector ─── worker     │
│  redis ─── api ─── worker           │
└─────────────────────────────────────┘
```

---

## Files

| File | Description |
|------|-------------|
| `docker-compose.yml` | All services, volumes, health checks |
| `infra/init-clickhouse.sql` | Market data schema (ohlcv, trades, orderbook, features) |
| `infra/init-postgres.sql` | Training metadata schema (jobs, models, versions, metrics, configs, datasets) |

---

## Database Schemas

### PostgreSQL (Training Metadata)

**Enums:**
- `training_status`: pending, queued, running, paused, completed, failed, cancelled
- `training_type`: rl_ppo, rl_dqn, rl_sac, llm_finetune, genetic, backtest
- `model_status`: draft, training, validated, deployed, archived

**Tables:**
- `models` — Model registry (name, type, status, tags)
- `model_versions` — Versioned checkpoints with metrics
- `training_jobs` — Job metadata, config, status, progress
- `training_metrics` — Time-series training metrics (loss, reward, win_rate, sharpe_ratio)
- `training_configs` — Reusable config templates
- `datasets` — Dataset definitions (symbols, date range, features)

### ClickHouse (Market Data)

**Tables:**
- `market_data.ohlcv` — Candle data, ordered by (symbol, timeframe, timestamp)
- `market_data.trades` — Raw trades
- `market_data.orderbook` — Orderbook snapshots
- `market_data.features` — Pre-computed feature vectors

---

## Tasks

- [x] Create `docker-compose.yml` with all services
- [x] Create `infra/init-clickhouse.sql` with market data tables
- [x] Create `infra/init-postgres.sql` with training metadata tables + seed configs
- [ ] Create K8s manifests (Deployments, Services, PVCs)
- [ ] Create Helm chart for parameterized deployment
- [ ] Add GPU node affinity for Ollama and training workers
- [ ] Add monitoring (Prometheus + Grafana stack)

---

## Verification

```bash
# Start all services
docker compose up -d

# Verify health
docker compose ps  # all should show "healthy"

# Test PostgreSQL
docker exec -it atp-postgres psql -U admin -d training_platform -c "\\dt"

# Test ClickHouse
docker exec -it atp-clickhouse clickhouse-client --query "SHOW TABLES FROM market_data"

# Test Redis
docker exec -it atp-redis redis-cli ping  # → PONG

# Test Qdrant
curl http://localhost:6333/healthz  # → OK

# Test Ollama
curl http://localhost:11434/api/tags  # → JSON
```
