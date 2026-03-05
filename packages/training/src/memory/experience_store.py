"""Experience Store — Qdrant-backed memory for trading experiences."""
import logging
from dataclasses import dataclass
from typing import Optional
from uuid import uuid4

import numpy as np

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import (
        Distance, VectorParams, PointStruct,
        Filter, FieldCondition, MatchValue,
    )
except ImportError:
    QdrantClient = None  # type: ignore

logger = logging.getLogger(__name__)

COLLECTION = "trading_experiences"


@dataclass
class Experience:
    state_vector: list[float]
    symbol: str
    action: int
    reward: float
    profit_pct: float
    timestamp: str
    model_id: str = ""
    episode_id: str = ""

    def to_payload(self) -> dict:
        return {
            "symbol": self.symbol,
            "action": self.action,
            "reward": self.reward,
            "profit_pct": self.profit_pct,
            "timestamp": self.timestamp,
            "model_id": self.model_id,
            "episode_id": self.episode_id,
        }

    @classmethod
    def from_scored_point(cls, point) -> "Experience":
        p = point.payload or {}
        return cls(
            state_vector=list(point.vector) if point.vector else [],
            symbol=p.get("symbol", ""),
            action=p.get("action", 0),
            reward=p.get("reward", 0),
            profit_pct=p.get("profit_pct", 0),
            timestamp=p.get("timestamp", ""),
            model_id=p.get("model_id", ""),
            episode_id=p.get("episode_id", ""),
        )


class ExperienceStore:
    """Qdrant-backed vector store for trading experiences."""

    def __init__(self, url: str = "localhost", port: int = 6333):
        if QdrantClient is None:
            logger.warning("qdrant-client not installed, running in dry-run mode")
            self.client = None
        else:
            self.client = QdrantClient(host=url, port=port)

    def ensure_collection(self, vector_size: int):
        """Create collection if not exists."""
        if not self.client:
            return
        try:
            self.client.get_collection(COLLECTION)
            logger.info(f"Collection '{COLLECTION}' already exists")
        except Exception:
            self.client.create_collection(
                collection_name=COLLECTION,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            logger.info(f"Created collection '{COLLECTION}' with dim={vector_size}")

    def store(self, experiences: list[Experience]):
        """Batch store experiences."""
        if not self.client:
            logger.debug(f"[DRY-RUN] Would store {len(experiences)} experiences")
            return

        points = [
            PointStruct(
                id=uuid4().hex,
                vector=e.state_vector,
                payload=e.to_payload(),
            )
            for e in experiences
        ]
        self.client.upsert(collection_name=COLLECTION, points=points)
        logger.info(f"Stored {len(points)} experiences")

    def query_similar(
        self,
        state_vector: list[float],
        top_k: int = 10,
        symbol: Optional[str] = None,
        min_profit: Optional[float] = None,
    ) -> list[Experience]:
        """Find similar market conditions."""
        if not self.client:
            return []

        query_filter = None
        conditions = []
        if symbol:
            conditions.append(FieldCondition(key="symbol", match=MatchValue(value=symbol)))
        if min_profit is not None:
            # Qdrant range filter would go here
            pass
        if conditions:
            query_filter = Filter(must=conditions)

        results = self.client.search(
            collection_name=COLLECTION,
            query_vector=state_vector,
            limit=top_k,
            query_filter=query_filter,
        )
        return [Experience.from_scored_point(r) for r in results]

    def get_stats(self) -> dict:
        """Collection statistics."""
        if not self.client:
            return {"status": "dry-run"}
        try:
            info = self.client.get_collection(COLLECTION)
            return {
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": str(info.status),
            }
        except Exception:
            return {"status": "not_found"}

    def delete_collection(self):
        """Delete the entire collection."""
        if self.client:
            self.client.delete_collection(COLLECTION)
