"""ClickHouse data storage — Kafka consumer → ClickHouse batch writer."""
import json
import logging
import time
from typing import Optional

try:
    import clickhouse_connect
except ImportError:
    clickhouse_connect = None  # type: ignore

try:
    from kafka import KafkaConsumer
except ImportError:
    KafkaConsumer = None  # type: ignore

logger = logging.getLogger(__name__)


class ClickHouseWriter:
    """Kafka consumer that batch-writes market data to ClickHouse."""

    def __init__(
        self,
        clickhouse_host: str = "localhost",
        clickhouse_port: int = 8123,
        kafka_brokers: str = "localhost:9092",
        buffer_size: int = 1000,
        flush_interval: float = 5.0,
    ):
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval
        self.kafka_brokers = kafka_brokers
        self._running = False

        if clickhouse_connect:
            self.client = clickhouse_connect.get_client(
                host=clickhouse_host, port=clickhouse_port
            )
        else:
            self.client = None
            logger.warning("clickhouse-connect not installed")

        self.buffers: dict[str, list[dict]] = {
            "market.ohlcv": [],
            "market.trades": [],
        }

    def run(self):
        """Start consuming from Kafka and writing to ClickHouse."""
        if KafkaConsumer is None:
            logger.error("kafka-python not installed")
            return

        consumer = KafkaConsumer(
            "market.ohlcv", "market.trades",
            bootstrap_servers=self.kafka_brokers,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="latest",
            group_id="clickhouse-writers",
        )

        self._running = True
        last_flush = time.time()
        logger.info("ClickHouse writer started")

        for message in consumer:
            if not self._running:
                break

            topic = message.topic
            if topic in self.buffers:
                self.buffers[topic].append(message.value)

            # Check flush conditions
            if (len(self.buffers.get(topic, [])) >= self.buffer_size or
                    time.time() - last_flush >= self.flush_interval):
                self._flush_all()
                last_flush = time.time()

        # Final flush
        self._flush_all()

    def _flush_all(self):
        for topic, buffer in self.buffers.items():
            if buffer:
                self._flush(topic, buffer)
                buffer.clear()

    def _flush(self, topic: str, records: list[dict]):
        if not self.client:
            logger.debug(f"[DRY-RUN] Would write {len(records)} records to {topic}")
            return

        try:
            if topic == "market.ohlcv":
                self._write_ohlcv(records)
            elif topic == "market.trades":
                self._write_trades(records)
            logger.info(f"Wrote {len(records)} records to ClickHouse ({topic})")
        except Exception as e:
            logger.error(f"ClickHouse write failed: {e}")

    def _write_ohlcv(self, records: list[dict]):
        data = [
            [r["symbol"], r.get("timeframe", "1m"), r["timestamp"],
             r["open"], r["high"], r["low"], r["close"], r["volume"]]
            for r in records
        ]
        self.client.insert(
            "market_data.ohlcv",
            data,
            column_names=["symbol", "timeframe", "timestamp", "open", "high", "low", "close", "volume"],
        )

    def _write_trades(self, records: list[dict]):
        data = [
            [r["symbol"], r["timestamp"], r["trade_id"],
             r["price"], r["quantity"], r["side"]]
            for r in records
        ]
        self.client.insert(
            "market_data.trades",
            data,
            column_names=["symbol", "timestamp", "trade_id", "price", "quantity", "side"],
        )

    def stop(self):
        self._running = False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    writer = ClickHouseWriter()
    writer.run()
