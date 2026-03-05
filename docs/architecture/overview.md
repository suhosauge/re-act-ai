# AI Training Platform — Architecture Overview

## Vision

A self-learning crypto trading platform that operates like an **AI Trading Research Lab** — ingesting market data, training RL/LLM agents through simulation, controlling the full training lifecycle via a dashboard, and continuously improving through live learning loops.

---

## System Architecture (High-Level)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD UI (Next.js)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Training  │ │  Model   │ │ Dataset  │ │  Live    │ │  System  │ │
│  │  Jobs     │ │ Registry │ │ Manager  │ │  Agent   │ │  Health  │ │
│  └─────┬────┘ └─────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
└────────┼────────────┼───────────┼────────────┼────────────┼────────┘
         │            │           │            │            │
    ─────┼────────────┼───────────┼────────────┼────────────┼─────
         │     REST API + WebSocket (Express/Node.js)       │
    ─────┼────────────┼───────────┼────────────┼────────────┼─────
         │            │           │            │            │
┌────────┴────────────┴───────────┴────────────┴────────────┴────────┐
│                    TRAINING CORE (Python)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Scheduler│ │RL Trainer│ │LLM Fine- │ │ Market   │ │ Feature  │ │
│  │ & Queue  │ │PPO/DQN   │ │  tuner   │ │ Simulator│ │  Engine  │ │
│  └─────┬────┘ └─────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
└────────┼────────────┼───────────┼────────────┼────────────┼────────┘
         │            │           │            │            │
┌────────┴────────────┴───────────┴────────────┴────────────┴────────┐
│                       INFRASTRUCTURE                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Postgres │ │ClickHouse│ │  Qdrant  │ │  Ollama  │ │Kafka+Redis│ │
│  │ metadata │ │ timeseries│ │  vectors │ │  LLM     │ │ messaging│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Modular** | Each module is independently deployable and testable |
| **Event-Driven** | Kafka/Redis pub-sub for async communication between modules |
| **Observable** | Every training step emits metrics visible in real-time on dashboard |
| **Lifecycle-Managed** | Training jobs have strict state machines: `pending → queued → running → paused/completed/failed` |
| **GPU-Optional** | Platform runs on CPU; GPU accelerates training but is not required |

---

## Module Map

| # | Module | Responsibility | Tech Stack |
|---|--------|---------------|------------|
| 1 | **Infrastructure** | Docker Compose / K8s services | Docker, K8s, Terraform |
| 2 | **Data Pipeline** | Market data ingestion & storage | Python, Binance API, Kafka, ClickHouse |
| 3 | **Feature Engine** | Technical indicator computation | Python, NumPy, TA-Lib |
| 4 | **Simulation** | Market environment for RL agents | Python, Gymnasium |
| 5 | **Training Core** | RL/LLM training loops & scheduling | Python, Stable-Baselines3, PyTorch |
| 6 | **Memory System** | Experience store for few-shot learning | Python, Qdrant |
| 7 | **Agent Runtime** | Live agent inference & paper trading | Python, Ollama |
| 8 | **API Layer** | REST + WebSocket gateway | TypeScript, Express |
| 9 | **Dashboard UI** | Training management & monitoring | TypeScript, Next.js, Recharts |
| 10 | **Model Registry** | Version tracking & deployment | PostgreSQL, API |

---

## Data Flow

```
Market Exchanges (Binance, Bybit)
        │
        ▼
  Data Collector ──→ Kafka ──→ ClickHouse (storage)
        │                         │
        ▼                         ▼
  Feature Engine ──→ Feature Vectors
        │
        ▼
  Market Simulator (Gymnasium env)
        │
        ├──→ RL Trainer (PPO/DQN/SAC) ──→ Model Checkpoint
        │                                      │
        ├──→ LLM Fine-tuner (Ollama)    ──→ Fine-tuned LLM
        │                                      │
        └──→ Genetic Trainer            ──→ Strategy Set
                                               │
                                               ▼
                                     Model Registry (Postgres)
                                               │
                                               ▼
                                     Agent Runtime (Live)
                                               │
                                               ▼
                                     Qdrant (experience memory)
```

---

## Communication Patterns

| From → To | Mechanism | Use Case |
|-----------|-----------|----------|
| API → Training Worker | Kafka commands | Start/stop/pause jobs |
| Training Worker → API | Redis pub/sub | Metric updates, status changes |
| API → Dashboard | WebSocket | Real-time metrics streaming |
| Dashboard → API | REST | CRUD, lifecycle actions |
| Collector → Storage | Kafka → ClickHouse | Market data persistence |
| Trainer → Memory | Qdrant client | Store/query experiences |

---

## Deployment Topology

### Development
- Single machine, Docker Compose
- All services on localhost

### Production
- Kubernetes cluster
- GPU nodes for training workers
- Dedicated data nodes for ClickHouse
- Inference nodes for Ollama

---

## Security Considerations

- Exchange API keys stored in K8s Secrets / env vars (never committed)
- PostgreSQL credentials via environment variables
- WebSocket connections authenticated via token (future)
- No direct internet exposure for training workers
