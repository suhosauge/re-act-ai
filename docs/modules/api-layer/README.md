# Module 8: API Layer

## Overview
Express/TypeScript REST API + WebSocket server. Acts as the gateway between the Dashboard UI and the Training Core backend. Manages all CRUD operations for jobs, models, datasets, and provides real-time metric streaming.

---

## Design

### Endpoint Map

#### Training Jobs (`/api/training-jobs`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List jobs (filter: status, type; paginate) |
| POST | `/` | Create job |
| GET | `/:id` | Get job details |
| PUT | `/:id` | Update job config |
| DELETE | `/:id` | Delete job |
| POST | `/:id/start` | Start training (pending → queued → running) |
| POST | `/:id/pause` | Pause training |
| POST | `/:id/resume` | Resume training |
| POST | `/:id/stop` | Stop/cancel training |
| GET | `/:id/metrics` | Get historical metrics |

#### Models (`/api/models`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List models |
| POST | `/` | Register new model |
| GET | `/:id` | Get model detail |
| GET | `/:id/versions` | List model versions |
| POST | `/:id/deploy` | Deploy a version |
| POST | `/:id/archive` | Archive model |

#### Datasets (`/api/datasets`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List datasets |
| POST | `/` | Create dataset |
| GET | `/:id` | Get dataset detail |

#### System (`/api`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API + DB health check |
| GET | `/system/status` | All service connection status |

### WebSocket Protocol (`ws://host:3001/ws`)

**Client → Server:**
| Message | Payload | Description |
|---------|---------|-------------|
| `subscribe` | `{ jobId }` | Subscribe to job metrics |
| `unsubscribe` | `{ jobId }` | Unsubscribe |
| `ping` | — | Keepalive |

**Server → Client:**
| Message | Payload | Description |
|---------|---------|-------------|
| `connected` | `{ clientId }` | Connection confirmed |
| `metric` | `{ jobId, data }` | Real-time metric update |
| `status_change` | `{ jobId, status }` | Job status changed |
| `pong` | — | Keepalive response |

---

## Files

| File | Purpose | Status |
|------|---------|--------|
| `server.ts` | Express entry point, middleware, health checks | ✅ Done |
| `db/index.ts` | PostgreSQL connection pool | ✅ Done |
| `routes/training-jobs.ts` | Training job REST endpoints | ✅ Done |
| `routes/models.ts` | Model REST endpoints | ✅ Done |
| `routes/datasets.ts` | Dataset REST endpoints | ✅ Done |
| `services/training-service.ts` | Training job business logic + state machine | ✅ Done |
| `services/model-service.ts` | Model business logic + versioning | ✅ Done |
| `ws/training-stream.ts` | WebSocket server + subscription | ✅ Done |

---

## Tasks

- [x] Express server with CORS, JSON parsing, health check
- [x] PostgreSQL connection pool
- [x] Training jobs CRUD routes
- [x] Training job lifecycle routes (start/pause/resume/stop)
- [x] Training metrics endpoint
- [x] Training service with state machine transitions
- [x] Models CRUD routes
- [x] Model versioning + deploy/archive
- [x] Model service
- [x] Datasets routes
- [x] System status endpoint (Postgres, Ollama, Qdrant, ClickHouse)
- [x] WebSocket server with subscription model
- [ ] Redis pub/sub consumer → WebSocket broadcast
- [ ] Kafka producer for training commands
- [ ] Request validation middleware
- [ ] Error handling middleware
- [ ] Rate limiting
- [ ] Authentication (JWT, future)
- [ ] API integration tests

---

## Dependencies
- **Upstream**: PostgreSQL, Redis, Kafka
- **Downstream**: Dashboard UI (consumer)
