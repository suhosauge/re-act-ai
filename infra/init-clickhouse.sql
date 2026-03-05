-- ClickHouse initialization: Market data tables

CREATE DATABASE IF NOT EXISTS market_data;

-- OHLCV candle data
CREATE TABLE IF NOT EXISTS market_data.ohlcv (
    symbol String,
    timeframe String,
    timestamp DateTime64 (3),
    open Float64,
    high Float64,
    low Float64,
    close Float64,
    volume Float64
) ENGINE = MergeTree ()
ORDER BY (symbol, timeframe, timestamp);

-- Raw trades
CREATE TABLE IF NOT EXISTS market_data.trades (
    symbol String,
    timestamp DateTime64 (3),
    price Float64,
    quantity Float64,
    side Enum8 ('buy' = 1, 'sell' = 2),
    trade_id String
) ENGINE = MergeTree ()
ORDER BY (symbol, timestamp);

-- Orderbook snapshots
CREATE TABLE IF NOT EXISTS market_data.orderbook (
    symbol String,
    timestamp DateTime64 (3),
    bids String, -- JSON array
    asks String, -- JSON array
    bid_total Float64,
    ask_total Float64
) ENGINE = MergeTree ()
ORDER BY (symbol, timestamp);

-- Computed feature vectors
CREATE TABLE IF NOT EXISTS market_data.features (
    symbol String,
    timeframe String,
    timestamp DateTime64 (3),
    rsi Float64,
    macd Float64,
    macd_signal Float64,
    vwap Float64,
    atr Float64,
    obv Float64,
    bb_upper Float64,
    bb_lower Float64,
    ob_imbalance Float64,
    volatility Float64,
    volume_spike Float64,
    sentiment Float64
) ENGINE = MergeTree ()
ORDER BY (symbol, timeframe, timestamp);