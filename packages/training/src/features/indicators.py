"""Feature engineering — technical indicators and market features."""
import numpy as np
import pandas as pd
from typing import Callable
from dataclasses import dataclass


@dataclass
class FeatureConfig:
    name: str
    fn: Callable[[pd.DataFrame], np.ndarray]
    window: int
    category: str


class FeatureRegistry:
    """Registry of available market features."""
    _features: dict[str, FeatureConfig] = {}

    @classmethod
    def register(cls, name: str, window: int = 0, category: str = "general"):
        def decorator(fn: Callable):
            cls._features[name] = FeatureConfig(name=name, fn=fn, window=window, category=category)
            return fn
        return decorator

    @classmethod
    def compute(cls, df: pd.DataFrame, features: list[str]) -> np.ndarray:
        results = []
        for name in features:
            if name not in cls._features:
                raise ValueError(f"Unknown feature: {name}")
            result = cls._features[name].fn(df)
            results.append(result)
        return np.column_stack(results)

    @classmethod
    def available(cls) -> list[str]:
        return list(cls._features.keys())


# ─── Technical Indicators ───

@FeatureRegistry.register("rsi_14", window=14, category="momentum")
def rsi(df: pd.DataFrame, period: int = 14) -> np.ndarray:
    delta = df["close"].diff()
    gain = delta.clip(lower=0).rolling(window=period).mean()
    loss = (-delta.clip(upper=0)).rolling(window=period).mean()
    rs = gain / (loss + 1e-10)
    return (100 - (100 / (1 + rs))).fillna(50).values

@FeatureRegistry.register("macd", window=26, category="momentum")
def macd(df: pd.DataFrame) -> np.ndarray:
    ema12 = df["close"].ewm(span=12).mean()
    ema26 = df["close"].ewm(span=26).mean()
    return (ema12 - ema26).fillna(0).values

@FeatureRegistry.register("macd_signal", window=35, category="momentum")
def macd_signal(df: pd.DataFrame) -> np.ndarray:
    ema12 = df["close"].ewm(span=12).mean()
    ema26 = df["close"].ewm(span=26).mean()
    macd_line = ema12 - ema26
    return macd_line.ewm(span=9).mean().fillna(0).values

@FeatureRegistry.register("vwap", window=0, category="volume")
def vwap(df: pd.DataFrame) -> np.ndarray:
    typical_price = (df["high"] + df["low"] + df["close"]) / 3
    cumvol = df["volume"].cumsum()
    cumvwap = (typical_price * df["volume"]).cumsum()
    return (cumvwap / (cumvol + 1e-10)).fillna(0).values

@FeatureRegistry.register("atr_14", window=14, category="volatility")
def atr(df: pd.DataFrame, period: int = 14) -> np.ndarray:
    high_low = df["high"] - df["low"]
    high_close = (df["high"] - df["close"].shift()).abs()
    low_close = (df["low"] - df["close"].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return tr.rolling(window=period).mean().fillna(0).values

@FeatureRegistry.register("obv", window=0, category="volume")
def obv(df: pd.DataFrame) -> np.ndarray:
    direction = np.sign(df["close"].diff()).fillna(0)
    return (direction * df["volume"]).cumsum().values

@FeatureRegistry.register("bb_upper", window=20, category="volatility")
def bollinger_upper(df: pd.DataFrame, period: int = 20) -> np.ndarray:
    sma = df["close"].rolling(window=period).mean()
    std = df["close"].rolling(window=period).std()
    return (sma + 2 * std).fillna(df["close"]).values

@FeatureRegistry.register("bb_lower", window=20, category="volatility")
def bollinger_lower(df: pd.DataFrame, period: int = 20) -> np.ndarray:
    sma = df["close"].rolling(window=period).mean()
    std = df["close"].rolling(window=period).std()
    return (sma - 2 * std).fillna(df["close"]).values

@FeatureRegistry.register("volatility_20", window=20, category="volatility")
def realized_volatility(df: pd.DataFrame, period: int = 20) -> np.ndarray:
    returns = df["close"].pct_change()
    return (returns.rolling(window=period).std() * np.sqrt(252)).fillna(0).values

@FeatureRegistry.register("volume_spike", window=20, category="volume")
def volume_spike(df: pd.DataFrame, period: int = 20) -> np.ndarray:
    vol_ma = df["volume"].rolling(window=period).mean()
    return (df["volume"] / (vol_ma + 1e-10)).fillna(1).values

@FeatureRegistry.register("returns_1", window=1, category="price")
def returns_1(df: pd.DataFrame) -> np.ndarray:
    return df["close"].pct_change().fillna(0).values

@FeatureRegistry.register("returns_5", window=5, category="price")
def returns_5(df: pd.DataFrame) -> np.ndarray:
    return df["close"].pct_change(5).fillna(0).values


# ─── Feature Pipeline ───

class FeaturePipeline:
    """Composable feature computation + normalization pipeline."""

    DEFAULT_FEATURES = [
        "rsi_14", "macd", "macd_signal", "vwap", "atr_14",
        "obv", "bb_upper", "bb_lower", "volatility_20", "volume_spike",
        "returns_1", "returns_5",
    ]

    def __init__(self, features: list[str] | None = None, normalize: str = "zscore"):
        self.features = features or self.DEFAULT_FEATURES
        self.normalize = normalize
        self._mean: np.ndarray | None = None
        self._std: np.ndarray | None = None
        self._min: np.ndarray | None = None
        self._max: np.ndarray | None = None

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        raw = FeatureRegistry.compute(df, self.features)
        if self.normalize == "zscore":
            self._mean = np.nanmean(raw, axis=0)
            self._std = np.nanstd(raw, axis=0) + 1e-10
            return (raw - self._mean) / self._std
        elif self.normalize == "minmax":
            self._min = np.nanmin(raw, axis=0)
            self._max = np.nanmax(raw, axis=0)
            return (raw - self._min) / (self._max - self._min + 1e-10)
        return raw

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        raw = FeatureRegistry.compute(df, self.features)
        if self.normalize == "zscore" and self._mean is not None:
            return (raw - self._mean) / self._std
        elif self.normalize == "minmax" and self._min is not None:
            return (raw - self._min) / (self._max - self._min + 1e-10)
        return raw

    @property
    def n_features(self) -> int:
        return len(self.features)

    def validate(self, data: np.ndarray) -> dict:
        return {
            "shape": data.shape,
            "has_nan": bool(np.isnan(data).any()),
            "has_inf": bool(np.isinf(data).any()),
            "nan_count": int(np.isnan(data).sum()),
        }
