# Module 7: Agent Runtime

## Overview
Runs trained models (RL or LLM) in live/paper-trading mode. Receives real-time market data, generates trading decisions, executes paper trades, evaluates results, and stores experiences for continuous learning.

---

## Design

### Live Loop
```
Market Data (Kafka) ──→ Feature Engine ──→ Agent Decision
                                              │
                         ┌────────────────────┤
                         ▼                    ▼
                   Qdrant Query         Model Inference
                   (similar states)     (RL or LLM)
                         │                    │
                         └────────┬───────────┘
                                  ▼
                          Trading Decision
                          (action + confidence)
                                  │
                                  ▼
                          Paper Trade Executor
                                  │
                                  ▼
                          Result Evaluator
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                   Qdrant Store      Metrics Report
                   (new experience)  (Redis → Dashboard)
```

### Decision Pipeline
1. **Receive** market data from Kafka
2. **Compute** features via Feature Pipeline
3. **Query** Qdrant for similar past experiences
4. **Infer** action from trained model (+ few-shot context)
5. **Execute** paper trade (or real trade in production)
6. **Evaluate** trade result when position closes
7. **Store** experience back to Qdrant
8. **Report** metrics to dashboard

### Model Loading
- **RL models**: Load SB3 checkpoint from filesystem
- **LLM models**: Use Ollama API with fine-tuned model name
- **Hybrid**: RL for action, LLM for reasoning/confirmation

---

## Files

| File | Purpose |
|------|---------|
| `agent/agent_runner.py` | Main live agent loop |
| `agent/paper_trader.py` | Paper trade execution engine |
| `agent/decision_engine.py` | Combines model + memory for decisions |

---

## Detail Design

### `agent_runner.py`
```python
class AgentRunner:
    def __init__(self, model_id: str, config: AgentConfig):
        self.model = self.load_model(model_id)
        self.feature_pipeline = FeaturePipeline(config.features)
        self.experience_store = ExperienceStore()
        self.paper_trader = PaperTrader(config.initial_capital)
        self.reporter = MetricsReporter(f"live-{model_id}")

    async def run(self):
        """Main loop — runs continuously."""
        async for market_data in self.kafka_stream():
            features = self.feature_pipeline.transform(market_data)
            similar = self.experience_store.query_similar(features, top_k=5)
            action, confidence = self.model.predict(features, context=similar)
            result = self.paper_trader.execute(action, market_data.price)
            if result.trade_closed:
                self.experience_store.store(result.to_experience())
            self.reporter.report(result.to_metrics())
```

---

## Tasks

- [ ] Implement `AgentRunner` (main live loop)
- [ ] Implement `PaperTrader` (simulated execution)
- [ ] Implement `DecisionEngine` (model + memory fusion)
- [ ] Implement model loader (SB3 checkpoint + Ollama)
- [ ] Implement live Kafka consumer for market data
- [ ] Add confidence thresholding (skip low-confidence decisions)
- [ ] Add position size management
- [ ] Write integration test with mock market data

---

## Dependencies
- **Upstream**: Training Core (trained models), Feature Engine, Memory System, Data Pipeline
- **Downstream**: Dashboard (live monitor), Memory System (new experiences)
