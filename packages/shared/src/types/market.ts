// ─── OHLCV Candle ───
export interface OHLCV {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Trade ───
export interface Trade {
  symbol: string;
  timestamp: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  trade_id: string;
}

// ─── OrderBook Level ───
export interface OrderBookLevel {
  price: number;
  quantity: number;
}

// ─── OrderBook Snapshot ───
export interface OrderBook {
  symbol: string;
  timestamp: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bid_total: number;
  ask_total: number;
}

// ─── Feature Vector ───
export interface FeatureVector {
  symbol: string;
  timeframe: string;
  timestamp: string;
  rsi: number;
  macd: number;
  macd_signal: number;
  vwap: number;
  atr: number;
  obv: number;
  bb_upper: number;
  bb_lower: number;
  ob_imbalance: number;
  volatility: number;
  volume_spike: number;
  sentiment: number;
}

// ─── Market State (for agent) ───
export interface MarketState {
  symbol: string;
  timestamp: string;
  price: number;
  features: number[];
  feature_names: string[];
}

// ─── Dataset ───
export interface Dataset {
  id: string;
  name: string;
  symbols: string[];
  timeframe: string;
  start_date: string;
  end_date: string;
  row_count: number;
  feature_config: Record<string, unknown>;
  status: 'building' | 'ready' | 'error';
  created_at: string;
}
