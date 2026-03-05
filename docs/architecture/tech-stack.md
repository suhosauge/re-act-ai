# Technology Stack — Decision Document

## Overview

This document records every technology choice, the rationale behind it, and alternatives considered.

---

## Frontend

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| Framework | **Next.js** | 16.x | App Router, SSR, file-based routing, excellent DX |
| Language | **TypeScript** | 5.x | Type safety across frontend and API |
| Charts | **Recharts** | 2.x | React-native, composable, responsive, good for time-series |
| Icons | **Lucide React** | latest | Tree-shakeable, consistent design, light weight |
| Dates | **date-fns** | 3.x | Modular, immutable, smaller than moment/dayjs |
| Styling | **Vanilla CSS** | — | Maximum control, custom design system, no framework lock-in |
| State | **React hooks + Context** | — | Simple enough for this scale; no Redux needed |
| Real-time | **WebSocket (native)** | — | Direct WS connection for metric streaming |

### Alternatives Considered
- **Tailwind CSS** — Rejected: custom dark theme with glassmorphism needs fine-grained CSS control
- **Tanstack Query** — Good option, may add later for data fetching caching
- **Socket.IO** — Overhead unnecessary; native WebSocket sufficient

---

## API Layer

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| Runtime | **Node.js** | 18+ | Native fetch, good async handling |
| Framework | **Express** | 4.x | Mature, minimal, well-known |
| WebSocket | **ws** | 8.x | Low-level, performant, native Node WS |
| Database client | **pg** | 8.x | Native PostgreSQL driver, connection pooling |
| Dev runner | **tsx** | 4.x | TypeScript execution without build step |

### Alternatives Considered
- **Fastify** — Faster, but Express ecosystem is larger
- **NestJS** — Too opinionated for this use case
- **tRPC** — Nice for type safety, but adds complexity

---

## Training Core

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| Language | **Python** | 3.11+ | ML ecosystem, PyTorch, Gymnasium |
| RL Framework | **Stable-Baselines3** | 2.x | Best-in-class RL implementations (PPO, DQN, SAC) |
| Environment | **Gymnasium** | 0.29+ | Standard RL environment interface |
| ML Framework | **PyTorch** | 2.x | Industry standard, CUDA support, dynamic graphs |
| Data | **NumPy + Pandas** | latest | Vectorized operations, time-series handling |
| Indicators | **TA-Lib** via `ta` | latest | Pure Python technical analysis library |
| Validation | **Pydantic** | 2.x | Config schema validation |

### Alternatives Considered
- **Ray RLlib** — More scalable but heavier; add later for distributed training
- **TensorFlow** — PyTorch has stronger RL ecosystem

---

## Infrastructure

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| LLM Inference | **Ollama** | latest | Local LLM, REST API, model management, fine-tuning |
| Vector DB | **Qdrant** | latest | Fast, filtering, payload storage, REST + gRPC |
| Time-series DB | **ClickHouse** | latest | Column-store, excellent for OHLCV queries, fast aggregations |
| Message Queue | **Kafka** | 7.5 (Confluent) | High-throughput, persistent, exactly-once |
| Cache/PubSub | **Redis** | 7.x | Fast pub/sub for metrics, job queue, caching |
| Metadata DB | **PostgreSQL** | 16.x | Relational, JSONB support, mature |
| Containerization | **Docker Compose** | 3.9 | Development orchestration |
| Orchestration | **Kubernetes** | — | Production deployment |

### Alternatives Considered
- **RabbitMQ** — Lower throughput than Kafka for market data streams
- **TimescaleDB** — Good, but ClickHouse better for pure analytics/reads
- **Weaviate/Milvus** — Qdrant has simpler API and better filtering
- **MongoDB** — PostgreSQL with JSONB covers same use case with ACID

---

## Build & Dev Tools

| Tool | Purpose |
|------|---------|
| npm workspaces | Monorepo management |
| Docker Compose | Local dev infrastructure |
| ESLint | Code quality |
| Pytest | Python testing |
| GitHub Actions (future) | CI/CD |
