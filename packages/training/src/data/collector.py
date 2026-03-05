"""Market data collector — Binance WebSocket → Kafka."""
import json
import asyncio
import logging
from datetime import datetime
from typing import Optional

try:
    import websockets
    from kafka import KafkaProducer
except ImportError:
    websockets = None  # type: ignore
    KafkaProducer = None  # type: ignore

logger = logging.getLogger(__name__)

BINANCE_WS = "wss://stream.binance.com:9443/stream"

class MarketCollector:
    """Connects to Binance WebSocket and publishes market data to Kafka."""

    def __init__(
        self,
        symbols: list[str],
        timeframes: list[str],
        kafka_brokers: str = "localhost:9092",
    ):
        self.symbols = [s.lower() for s in symbols]
        self.timeframes = timeframes
        self.kafka_brokers = kafka_brokers
        self.producer: Optional[KafkaProducer] = None
        self._running = False

    def _init_kafka(self):
        if KafkaProducer is None:
            logger.warning("kafka-python not installed, running in dry-run mode")
            return
        self.producer = KafkaProducer(
            bootstrap_servers=self.kafka_brokers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )

    def _build_streams(self) -> list[str]:
        streams = []
        for symbol in self.symbols:
            for tf in self.timeframes:
                streams.append(f"{symbol}@kline_{tf}")
            streams.append(f"{symbol}@trade")
        return streams

    async def start(self):
        """Start collecting market data."""
        self._init_kafka()
        streams = self._build_streams()
        url = f"{BINANCE_WS}?streams={'/'.join(streams)}"

        logger.info(f"Connecting to Binance WS with {len(streams)} streams")
        self._running = True

        while self._running:
            try:
                async with websockets.connect(url) as ws:
                    logger.info("Connected to Binance WebSocket")
                    async for message in ws:
                        if not self._running:
                            break
                        self._handle_message(json.loads(message))
            except Exception as e:
                logger.error(f"WebSocket error: {e}, reconnecting in 5s...")
                await asyncio.sleep(5)

    def _handle_message(self, msg: dict):
        stream = msg.get("stream", "")
        data = msg.get("data", {})

        if "@kline_" in stream:
            self._handle_kline(data)
        elif "@trade" in stream:
            self._handle_trade(data)

    def _handle_kline(self, data: dict):
        k = data.get("k", {})
        record = {
            "symbol": k.get("s", ""),
            "timeframe": k.get("i", ""),
            "timestamp": datetime.fromtimestamp(k.get("t", 0) / 1000).isoformat(),
            "open": float(k.get("o", 0)),
            "high": float(k.get("h", 0)),
            "low": float(k.get("l", 0)),
            "close": float(k.get("c", 0)),
            "volume": float(k.get("v", 0)),
            "closed": k.get("x", False),
        }
        self._publish("market.ohlcv", record)

    def _handle_trade(self, data: dict):
        record = {
            "symbol": data.get("s", ""),
            "timestamp": datetime.fromtimestamp(data.get("T", 0) / 1000).isoformat(),
            "price": float(data.get("p", 0)),
            "quantity": float(data.get("q", 0)),
            "side": "buy" if data.get("m", False) else "sell",
            "trade_id": str(data.get("t", "")),
        }
        self._publish("market.trades", record)

    def _publish(self, topic: str, record: dict):
        if self.producer:
            self.producer.send(topic, value=record)
        else:
            logger.debug(f"[DRY-RUN] {topic}: {record['symbol']}")

    def stop(self):
        self._running = False
        if self.producer:
            self.producer.flush()
            self.producer.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    collector = MarketCollector(
        symbols=["BTCUSDT", "ETHUSDT"],
        timeframes=["1m", "5m", "1h"],
    )
    asyncio.run(collector.start())
