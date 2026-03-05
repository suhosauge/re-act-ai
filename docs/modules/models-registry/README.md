# Module 10: Model Registry

## Overview
Tracks all trained models, their versions (checkpoints), evaluation metrics, and deployment status. Enables comparing model versions and promoting the best one to production.

---

## Design

### Model Lifecycle
```
DRAFT ──→ TRAINING ──→ VALIDATED ──→ DEPLOYED
                           │              │
                           └──→ ARCHIVED ←┘
```

### Data Model

**Model:**
- `id`, `name`, `type` (rl_ppo, rl_dqn, llm_finetune...)
- `status` (draft → training → validated → deployed → archived)
- `description`, `tags[]`

**Model Version:**
- `model_id`, `version` (auto-increment)
- `checkpoint_path` (filesystem path to saved weights)
- `metrics` (JSON: total_return, sharpe, drawdown, win_rate, profit_factor)
- `is_deployed` (only one version per model can be deployed)

### Version Comparison

| Metric | v1 | v2 | v3 |
|--------|----|----|-----|
| Total Return | 12.4% | 18.2% | 15.7% |
| Sharpe Ratio | 1.2 | 1.8 | 1.5 |
| Max Drawdown | -8.3% | -5.1% | -6.2% |
| Win Rate | 54% | 61% | 58% |
| Profit Factor | 1.3 | 1.7 | 1.5 |

### Deployment Flow
1. Training completes → auto-create model version with metrics
2. User reviews metrics in Dashboard
3. User clicks "Deploy" on best version
4. System: un-deploy all other versions → deploy selected
5. Agent Runtime loads new model

---

## Files

| File | Purpose | Status |
|------|---------|--------|
| `api/services/model-service.ts` | CRUD, versioning, deploy logic | ✅ Done |
| `api/routes/models.ts` | REST endpoints | ✅ Done |
| `infra/init-postgres.sql` | `models` + `model_versions` tables | ✅ Done |
| `shared/types/model.ts` | TypeScript interfaces | ✅ Done |

---

## Tasks

- [x] PostgreSQL schema (models, model_versions)
- [x] Model service (CRUD, versioning, deploy/archive)
- [x] Model REST routes
- [x] Shared TypeScript types
- [ ] Auto-create version on training completion
- [ ] Checkpoint file management (save/load/delete)
- [ ] Model export (download checkpoint + config)
- [ ] Model comparison API endpoint
- [ ] Tags management
- [ ] Model search/filter

---

## Dependencies
- **Upstream**: Training Core (creates versions), PostgreSQL
- **Downstream**: Agent Runtime (loads models), Dashboard (browse/compare)
