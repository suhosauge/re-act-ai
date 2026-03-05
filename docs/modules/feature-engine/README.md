# Module 3: Feature Engine

## Overview
Computes technical indicators and market features from raw OHLCV/orderbook data. Produces standardized feature vectors consumed by the Simulation environment and Training Core.

---

## Design

### Pipeline Architecture
```
Raw OHLCV + Orderbook (ClickHouse)
        │
        ▼
  Feature Pipeline
  ├── Technical Indicators (RSI, MACD, VWAP, BB, ATR, OBV)
  ├── Orderbook Features (imbalance, spread, depth)
  ├── Volume Features (spike detection, OBV delta)
  ├── Volatility Features (realized vol, ATR ratio)
  └── Sentiment (future: news/social)
        │
        ▼
  Normalization (z-score or min-max)
        │
        ▼
  Feature Vector [n-dimensional float array]
        │
        ├──→ ClickHouse `features` table (persisted)
        └──→ Training Env `observation_space`
```

### Feature Catalog

| Category | Feature | Formula | Window |
|----------|---------|---------|--------|
| Momentum | RSI | Relative Strength Index | 14 |
| Momentum | MACD | EMA(12) - EMA(26), signal=EMA(9) | 12/26/9 |
| Volume | VWAP | Σ(price×vol) / Σ(vol) | session |
| Volume | OBV | On-Balance Volume | cumulative |
| Volume | Volume Spike | vol / SMA(vol, 20) | 20 |
| Volatility | ATR | Average True Range | 14 |
| Volatility | Bollinger Bands | SMA ± 2×σ | 20 |
| Volatility | Realized Vol | std(returns) × √252 | 20 |
| Orderbook | Imbalance | (bid_vol - ask_vol) / total_vol | instant |
| Orderbook | Spread | (best_ask - best_bid) / mid_price | instant |
| Orderbook | Depth Ratio | bid_depth_5 / ask_depth_5 | instant |
| Composite | Sentiment Score | (future: NLP on news) | — |

### Normalization Strategy
- **Z-score**: `(x - mean) / std` — for normally distributed features (RSI, MACD)
- **Min-max**: `(x - min) / (max - min)` — for bounded features (imbalance 0-1)
- Rolling window for online normalization (lookback = 100 candles)

---

## Files

| File | Purpose |
|------|---------|
| `packages/training/src/features/indicators.py` | RSI, MACD, VWAP, BB, ATR, OBV implementations |
| `packages/training/src/features/orderbook_features.py` | Orderbook imbalance, spread, depth |
| `packages/training/src/features/feature_pipeline.py` | Composable pipeline: registry + compute + normalize |
| `packages/training/src/features/validation.py` | NaN/Inf checks, feature importance scoring |

---

## Detail Design

### Feature Registry Pattern
```python
class FeatureRegistry:
    _features: dict[str, FeatureConfig] = {}

    @classmethod
    def register(cls, name: str, fn: Callable, window: int, category: str):
        cls._features[name] = FeatureConfig(name=name, fn=fn, window=window, category=category)

    @classmethod
    def compute_all(cls, ohlcv: pd.DataFrame, feature_names: list[str]) -> np.ndarray:
        """Compute selected features and return as (n_samples, n_features) array."""
        results = []
        for name in feature_names:
            cfg = cls._features[name]
            results.append(cfg.fn(ohlcv))
        return np.column_stack(results)
```

### Feature Pipeline
```python
class FeaturePipeline:
    def __init__(self, features: list[str], normalize: str = 'zscore'):
        self.features = features
        self.normalize = normalize
        self.scaler = None

    def fit_transform(self, ohlcv: pd.DataFrame) -> np.ndarray:
        raw = FeatureRegistry.compute_all(ohlcv, self.features)
        self.scaler = self._fit_scaler(raw)
        return self._transform(raw)

    def transform(self, ohlcv: pd.DataFrame) -> np.ndarray:
        raw = FeatureRegistry.compute_all(ohlcv, self.features)
        return self._transform(raw)
```

---

## Config

```yaml
# Default feature set for RL training
default_features:
  - rsi_14
  - macd
  - macd_signal
  - vwap
  - atr_14
  - obv
  - bb_upper
  - bb_lower
  - ob_imbalance
  - volatility_20
  - volume_spike

normalization: zscore
lookback_window: 100
```

---

## Tasks

- [ ] Implement RSI, MACD, VWAP (vectorized NumPy)
- [ ] Implement Bollinger Bands, ATR, OBV
- [ ] Implement orderbook features (imbalance, spread, depth)
- [ ] Implement volume spike detection
- [ ] Build FeatureRegistry with registration pattern
- [ ] Build FeaturePipeline (compose + normalize)
- [ ] Implement z-score and min-max normalizers
- [ ] Add NaN/Inf validation layer
- [ ] Add feature importance scoring (correlation with future returns)
- [ ] Write unit tests for each indicator (compare against TA-Lib reference)
- [ ] Store computed features to ClickHouse `features` table
- [ ] Add "custom feature" support for user-defined Python expressions

---

## Verification

```bash
# Unit test indicators against known data
python -m pytest tests/features/ -v

# Compute features for a sample dataset
python -m src.features.feature_pipeline --symbol BTCUSDT --timeframe 1h --start 2024-01-01 --end 2024-02-01

# Verify no NaN/Inf in output
python -c "
import numpy as np
features = np.load('/tmp/features_btcusdt.npy')
assert not np.isnan(features).any(), 'NaN found!'
assert not np.isinf(features).any(), 'Inf found!'
print(f'Shape: {features.shape}, Clean!')
"
```

---

## Dependencies
- **Upstream**: Data Pipeline (OHLCV, orderbook from ClickHouse)
- **Downstream**: Simulation (observation space), Training Core (input data)
