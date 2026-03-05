# Module 2: Data Pipeline

## Overview
Ingests real-time and historical market data from crypto exchanges, streams through Kafka, and persists to ClickHouse. Provides the raw data foundation for feature engineering and training.

---

## Design

### Architecture
```
Exchange APIs (Binance, Bybit, OKX)
        │
        ▼
  WebSocket Collector (Python)
        │
        ├──→ Kafka topic: market.ohlcv
        ├──→ Kafka topic: market.trades
        └──→ Kafka topic: market.orderbook
                    │
                    ▼
            ClickHouse Writer
                    │
                    ▼
              ClickHouse Tables
```

### Data Types Collected

| Data Type | Source | Frequency | Kafka Topic | Storage |
|-----------|--------|-----------|-------------|---------|
| OHLCV candles | Binance kline WS | 1s–1d intervals | `market.ohlcv` | ClickHouse `ohlcv` |
| Raw trades | Binance trade WS | Real-time | `market.trades` | ClickHouse `trades` |
| Orderbook | Binance depth WS | Every 100ms | `market.orderbook` | ClickHouse `orderbook` |
| Funding rate | REST API | Every 8h | `market.funding` | ClickHouse (future) |

### Historical Data Backfill
- Use Binance REST API `/api/v3/klines`
- Configurable date range and symbols
- Rate-limited to respect API quotas (1200 req/min)
- Parallel download across multiple symbols

---

## Files

| File | Purpose |
|------|---------|
| `packages/training/src/data/collector.py` | Binance WebSocket connector, publishes to Kafka |
| `packages/training/src/data/storage.py` | Kafka consumer → ClickHouse batch writer |
| `packages/training/src/data/historical_loader.py` | REST API historical data backfill |
| `packages/training/src/data/dataset_builder.py` | Build training episodes from ClickHouse data |

---

## Detail Design

### `collector.py`
```python
class MarketCollector:
    def __init__(self, symbols: list[str], timeframes: list[str]):
        self.symbols = symbols       # ["BTCUSDT", "ETHUSDT"]
        self.timeframes = timeframes  # ["1m", "5m", "1h"]
        self.kafka_producer = KafkaProducer(bootstrap_servers=KAFKA_BROKERS)

    async def start(self):
        """Connect to Binance WS and forward to Kafka."""
        streams = [f"{s.lower()}@kline_{tf}" for s in self.symbols for tf in self.timeframes]
        async with connect(f"wss://stream.binance.com:9443/stream?streams={'/'.join(streams)}"):
            async for msg in ws:
                topic = self.resolve_topic(msg)
                self.kafka_producer.send(topic, value=json.dumps(msg))
```

### `storage.py`
```python
class ClickHouseWriter:
    def __init__(self):
        self.client = clickhouse_connect.get_client(host='localhost', port=8123)
        self.buffer: list[dict] = []
        self.buffer_size = 1000
        self.flush_interval = 5  # seconds

    def consume_and_write(self, topic: str):
        """Kafka consumer → buffer → ClickHouse batch insert."""
        for msg in consumer:
            self.buffer.append(msg.value)
            if len(self.buffer) >= self.buffer_size:
                self.flush()

    def flush(self):
        """Write buffered rows to ClickHouse."""
        self.client.insert('market_data.ohlcv', self.buffer, column_names=[...])
        self.buffer.clear()
```

### `dataset_builder.py`
```python
class DatasetBuilder:
    def build(self, config: DatasetConfig) -> str:
        """
        Query ClickHouse → build feature matrix → save as .parquet
        Returns: dataset_id
        """
        raw_data = self.query_clickhouse(config.symbols, config.start_date, config.end_date)
        features = self.feature_engine.compute(raw_data)
        episodes = self.split_episodes(features, config.episode_length)
        path = self.save_dataset(episodes, config.name)
        return dataset_id
```

---

## Config

```yaml
# data-pipeline config
symbols:
  - BTCUSDT
  - ETHUSDT
  - SOLUSDT
  - BNBUSDT

timeframes:
  - 1m
  - 5m
  - 15m
  - 1h

kafka:
  brokers: ["localhost:9092"]
  topics:
    ohlcv: market.ohlcv
    trades: market.trades
    orderbook: market.orderbook

clickhouse:
  host: localhost
  port: 8123
  database: market_data

buffer:
  size: 1000
  flush_interval_seconds: 5
```

---

## Tasks

- [ ] Implement Binance WebSocket collector
- [ ] Implement Kafka producer with error handling & reconnection
- [ ] Implement ClickHouse batch writer with buffer management
- [ ] Implement historical data downloader (REST API)
- [ ] Implement dataset builder (ClickHouse → NumPy/Parquet)
- [ ] Add support for multiple exchanges (Bybit, OKX)
- [ ] Add data quality validation (gap detection, anomaly check)
- [ ] Write unit tests with mock WebSocket/Kafka
- [ ] Write integration test with containerized services

---

## Verification

```bash
# Start collector
python -m src.data.collector --symbols BTCUSDT,ETHUSDT --timeframes 1m,5m

# Verify Kafka receives data
kafka-console-consumer --bootstrap-server localhost:9092 --topic market.ohlcv --from-beginning --max-messages 5

# Verify ClickHouse has data
docker exec atp-clickhouse clickhouse-client --query "SELECT count() FROM market_data.ohlcv"

# Build a test dataset
python -m src.data.dataset_builder --name test_btc_2024 --symbol BTCUSDT --start 2024-01-01 --end 2024-06-01
```

---

## Dependencies
- **Upstream**: Exchange APIs (internet access required)
- **Downstream**: Feature Engine, Simulation, Training Core
