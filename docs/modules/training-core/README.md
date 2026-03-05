# Module 5: Training Core

## Overview
The heart of the platform — manages RL training loops (PPO/DQN/SAC), LLM fine-tuning via Ollama, genetic strategy evolution, job scheduling, metric reporting, and lifecycle management.

---

## Design

### Component Architecture
```
API (start/stop/pause commands)
        │ Kafka
        ▼
  Training Worker
        │
        ├── RL Trainer (Stable-Baselines3)
        │     └── MarketEnv + RewardFn → model checkpoint
        │
        ├── LLM Fine-tuner (Ollama)
        │     └── trade history → fine-tuned model
        │
        └── Genetic Trainer
              └── strategy population → evolved strategies
        │
        ▼
  Metrics Reporter ──→ Redis pub/sub ──→ API ──→ Dashboard
                   └──→ PostgreSQL (persist)
        │
        ▼
  Model Registry (checkpoint + metrics snapshot)
```

### Training Job State Machine
```
┌─────────┐     ┌────────┐     ┌─────────┐
│ PENDING  │────▶│ QUEUED  │────▶│ RUNNING │
└─────────┘     └────────┘     └────┬────┘
                    ▲               │
                    │         ┌─────┼──────┐
                    │         ▼     ▼      ▼
                ┌───┴───┐ ┌──────┐ ┌──────────┐ ┌──────────┐
                │FAILED  │ │PAUSED│ │COMPLETED │ │CANCELLED │
                └────────┘ └──────┘ └──────────┘ └──────────┘
                (retry→queued)  (resume→running)
```

### Scheduler Design
- **Priority Queue**: Redis sorted set (`training:queue`)
- **Resource Awareness**: Track GPU memory, CPU cores per worker
- **Concurrent Limit**: Max N jobs running simultaneously (configurable)
- **Auto-retry**: Failed jobs retry with exponential backoff (max 3 retries)
- **Cron Triggers**: Periodic retraining (e.g., "retrain every 1000 trades")

---

## Files

| File | Purpose |
|------|---------|
| `trainers/rl_trainer.py` | Stable-Baselines3 wrapper (PPO, DQN, SAC) |
| `trainers/llm_finetuner.py` | Ollama model fine-tuning pipeline |
| `trainers/genetic_trainer.py` | Genetic algorithm strategy evolution |
| `workers/training_worker.py` | Kafka consumer, dispatches to trainers |
| `reporters/metrics_reporter.py` | Redis + Postgres metric publishing |
| `scheduler/scheduler.py` | Priority queue, resource-aware scheduling |
| `evaluators/strategy_evaluator.py` | Backtest and evaluation runner |
| `configs/templates.py` | Pre-built config templates |
| `configs/validation.py` | Pydantic config schemas |

---

## Detail Design

### `rl_trainer.py`
```python
class RLTrainer:
    def __init__(self, job_id: str, config: TrainingConfig):
        self.job_id = job_id
        self.env = MarketEnv(config.env_config)
        self.model = self._create_model(config)
        self.reporter = MetricsReporter(job_id)
        self._paused = False
        self._stopped = False

    def train(self):
        callback = MetricsCallback(self.reporter, check_signals=self._check_signals)
        self.model.learn(
            total_timesteps=self.config.total_timesteps,
            callback=callback,
            progress_bar=False,
        )
        self.model.save(f"checkpoints/{self.job_id}/final")

    def pause(self):  self._paused = True
    def resume(self): self._paused = False
    def stop(self):   self._stopped = True
```

### `training_worker.py`
```python
class TrainingWorker:
    """Kafka consumer that dispatches training commands to trainers."""

    def __init__(self):
        self.consumer = KafkaConsumer('training.commands')
        self.active_jobs: dict[str, RLTrainer | LLMFinetuner] = {}

    def run(self):
        for message in self.consumer:
            cmd = json.loads(message.value)
            match cmd['action']:
                case 'start':  self.start_job(cmd)
                case 'pause':  self.active_jobs[cmd['job_id']].pause()
                case 'resume': self.active_jobs[cmd['job_id']].resume()
                case 'stop':   self.active_jobs[cmd['job_id']].stop()
```

### `metrics_reporter.py`
```python
class MetricsReporter:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.redis = Redis()
        self.db = PostgresConnection()
        self.buffer = []

    def report(self, step: int, metrics: dict):
        # Real-time → Redis pub/sub
        self.redis.publish(f'training:{self.job_id}:metrics', json.dumps({
            'step': step, **metrics
        }))
        # Persist → buffer → batch write
        self.buffer.append({'job_id': self.job_id, 'step': step, **metrics})
        if len(self.buffer) >= 10:
            self.flush_to_db()
```

---

## Config Templates

| Template | Type | Key Parameters |
|----------|------|---------------|
| RL Quick Test | `rl_ppo` | 10K steps, lr=3e-4, small network |
| RL Full Training | `rl_ppo` | 1M steps, lr=1e-4, large network |
| DQN Standard | `rl_dqn` | 500K steps, replay buffer=100K |
| LLM Market Reasoning | `llm_finetune` | llama3 base, 3 epochs, 5K samples |
| Genetic Strategy | `genetic` | 500 pop, 50 gen, 0.1 mutation |

---

## Tasks

- [ ] Implement `RLTrainer` (SB3 wrapper with pause/resume/stop)
- [ ] Implement `MetricsCallback` (SB3 callback → MetricsReporter)
- [ ] Implement `LLMFinetuner` (trade history → Ollama fine-tune dataset → model create)
- [ ] Implement `GeneticTrainer` (strategy generation, mutation, selection)
- [ ] Implement `TrainingWorker` (Kafka consumer, job dispatch)
- [ ] Implement `MetricsReporter` (Redis pub/sub + Postgres batch)
- [ ] Implement `Scheduler` (Redis priority queue, resource tracking)
- [ ] Implement `StrategyEvaluator` (backtest on hold-out data)
- [ ] Define Pydantic config schemas
- [ ] Create config templates
- [ ] Signal handling for graceful shutdown
- [ ] Checkpoint saving/loading
- [ ] Unit tests per trainer
- [ ] Integration test: full job lifecycle

---

## Verification
```bash
# Start training worker
python -m src.workers.training_worker

# Submit a test job via Kafka
echo '{"action":"start","job_id":"test-001","type":"rl_ppo","config":{...}}' | \
  kafka-console-producer --bootstrap-server localhost:9092 --topic training.commands

# Monitor metrics via Redis
redis-cli SUBSCRIBE 'training:test-001:metrics'

# Check Postgres metrics
psql -U admin -d training_platform -c "SELECT * FROM training_metrics WHERE job_id='test-001' ORDER BY step DESC LIMIT 5"
```

---

## Dependencies
- **Upstream**: Simulation (MarketEnv), Feature Engine (feature pipeline), Data Pipeline (datasets)
- **Downstream**: Model Registry (checkpoints), Dashboard (metrics), Memory System (experiences)
