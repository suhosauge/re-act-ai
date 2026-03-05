# Module 6: Memory System (Qdrant)

## Overview
Stores trading experiences as vectors in Qdrant. Enables "few-shot learning" — agents query similar past market conditions to make better decisions. Acts as the persistent memory of the entire platform.

---

## Design

### Concept
```
(state, action, reward, outcome) → embedding → Qdrant

Agent query:
  "What happened in similar market conditions?"
  → top-K similar experiences
  → inform decision
```

### Collection Schema

**Collection: `trading_experiences`**

| Field | Type | Description |
|-------|------|-------------|
| Vector | `float[n]` | Market state feature vector (same as env observation) |
| `symbol` | payload (string) | Trading pair |
| `action` | payload (int) | Action taken (0-4) |
| `reward` | payload (float) | Reward received |
| `profit_pct` | payload (float) | Profit/loss percentage |
| `timestamp` | payload (string) | When this experience occurred |
| `model_id` | payload (string) | Which model generated this |
| `episode_id` | payload (string) | Training episode ID |

### Query Patterns

| Use Case | Query | Filter |
|----------|-------|--------|
| Similar market states | Vector similarity search | symbol filter |
| Past decisions for condition | Vector search + action filter | action=BUY |
| Win/loss review | Vector search + profit filter | profit_pct > 0 |
| Model-specific memory | Vector search + model filter | model_id=X |

---

## Files

| File | Purpose |
|------|---------|
| `memory/experience_store.py` | Qdrant CRUD, collection management |
| `memory/embedding.py` | Feature vector → Qdrant vector encoding |

---

## Detail Design

### `experience_store.py`
```python
class ExperienceStore:
    COLLECTION = "trading_experiences"

    def __init__(self, qdrant_url: str = "localhost", qdrant_port: int = 6333):
        self.client = QdrantClient(host=qdrant_url, port=qdrant_port)

    def ensure_collection(self, vector_size: int):
        """Create collection if not exists."""
        self.client.recreate_collection(
            collection_name=self.COLLECTION,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )

    def store(self, experiences: list[Experience]):
        """Batch store experiences."""
        points = [PointStruct(id=uuid4().hex, vector=e.state_vector,
                    payload=e.to_payload()) for e in experiences]
        self.client.upsert(self.COLLECTION, points)

    def query_similar(self, state_vector: list[float], top_k: int = 10,
                      filters: dict = None) -> list[Experience]:
        """Find similar market conditions."""
        results = self.client.search(
            collection_name=self.COLLECTION,
            query_vector=state_vector,
            limit=top_k,
            query_filter=self._build_filter(filters),
        )
        return [Experience.from_scored_point(r) for r in results]

    def get_stats(self) -> dict:
        """Collection statistics."""
        info = self.client.get_collection(self.COLLECTION)
        return {"vectors_count": info.vectors_count, "status": info.status}
```

---

## Tasks

- [ ] Implement `ExperienceStore` (Qdrant client wrapper)
- [ ] Implement collection creation with configurable vector size
- [ ] Implement batch store experiences
- [ ] Implement similarity search with payload filtering
- [ ] Implement collection stats endpoint
- [ ] Add experience serialization/deserialization
- [ ] Add bulk export/import for backup
- [ ] Write unit tests with Qdrant test container
- [ ] Integration with Training Core (store after each episode)

---

## Dependencies
- **Upstream**: Simulation (state vectors), Training Core (experiences)
- **Downstream**: Agent Runtime (few-shot query), Dashboard (visualization)
