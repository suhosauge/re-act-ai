# Module 4: Simulation Engine

## Overview
Provides a Gymnasium-compatible market environment that treats trading as a **game**. Agents interact by observing market state (features) and taking actions (BUY/SELL/HOLD). The environment returns rewards based on PnL and risk metrics.

---

## Design

### Core Concept: Market as Game
```
Agent
  │
  ├── observes → state (feature vector + portfolio)
  ├── takes    → action (BUY, SELL, HOLD, SHORT, CLOSE)
  └── receives → reward (PnL - risk_penalty)
```

### Gymnasium Interface
```python
class MarketEnv(gymnasium.Env):
    observation_space = Box(low=-inf, high=inf, shape=(n_features + n_portfolio,))
    action_space = Discrete(5)  # BUY, SELL, HOLD, SHORT, CLOSE

    def reset(self) -> observation
    def step(self, action) -> (observation, reward, terminated, truncated, info)
```

### State Composition
```
observation = [
    feature_vector,      # RSI, MACD, VWAP, ... (from Feature Engine)
    portfolio_state,     # position_size, unrealized_pnl, cash_ratio
    market_context,      # current_price, spread, volume_ma
]
```

### Action Space

| Action | ID | Description |
|--------|-----|-------------|
| HOLD | 0 | Do nothing |
| BUY | 1 | Open long position (full allocation) |
| SELL | 2 | Close long position |
| SHORT | 3 | Open short position |
| CLOSE | 4 | Close any open position |

### Reward Functions

| Name | Formula | Best For |
|------|---------|----------|
| `PnLReward` | `realized_pnl + unrealized_pnl_delta` | Simple profit optimization |
| `SharpeReward` | `mean(returns) / std(returns) * sqrt(252)` | Risk-adjusted returns |
| `DrawdownPenaltyReward` | `pnl - λ × max_drawdown` | Drawdown-sensitive strategies |
| `CompositeReward` | `w₁×pnl + w₂×sharpe - w₃×drawdown` | Balanced optimization |

---

## Files

| File | Purpose |
|------|---------|
| `packages/training/src/simulation/market_env.py` | Gymnasium env implementation |
| `packages/training/src/simulation/rewards.py` | Reward function library |
| `packages/training/src/simulation/portfolio.py` | Position tracking, PnL, equity curve |

---

## Detail Design

### `market_env.py`
```python
class MarketEnv(gymnasium.Env):
    def __init__(self, config: EnvConfig):
        self.data = None                          # loaded from dataset
        self.current_step = 0
        self.portfolio = Portfolio(config.initial_capital)
        self.reward_fn = get_reward_fn(config.reward_function)
        self.fee_rate = config.fee_rate            # default: 0.001 (0.1%)
        self.max_steps = config.max_steps

        n_features = len(config.feature_names)
        self.observation_space = Box(-np.inf, np.inf, shape=(n_features + 4,))
        self.action_space = Discrete(5)

    def reset(self, seed=None):
        self.current_step = 0
        self.portfolio.reset()
        return self._get_obs(), {}

    def step(self, action: int):
        price = self.data[self.current_step]['close']
        self.portfolio.execute(action, price, self.fee_rate)
        self.current_step += 1

        reward = self.reward_fn.compute(self.portfolio)
        terminated = self.current_step >= len(self.data) - 1
        truncated = self.portfolio.is_bankrupt()

        return self._get_obs(), reward, terminated, truncated, self._get_info()
```

### `portfolio.py`
```python
class Portfolio:
    def __init__(self, initial_capital: float):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.position = 0            # +N long, -N short, 0 flat
        self.entry_price = 0
        self.equity_curve = []
        self.trades = []

    def execute(self, action: int, price: float, fee_rate: float):
        """Execute trade action at current price."""
        ...

    @property
    def total_return(self) -> float: ...
    @property
    def max_drawdown(self) -> float: ...
    @property
    def sharpe_ratio(self) -> float: ...
    @property
    def win_rate(self) -> float: ...
```

### Episode Configuration
```python
@dataclass
class EnvConfig:
    dataset_path: str                    # path to .parquet or .npy
    feature_names: list[str]             # select features from dataset
    initial_capital: float = 10000.0
    fee_rate: float = 0.001              # 0.1% per trade
    max_steps: int = 1000                # truncation limit
    reward_function: str = 'composite'   # 'pnl', 'sharpe', 'drawdown_penalty', 'composite'
    leverage: float = 1.0                # max leverage
    slippage: float = 0.0005             # simulated slippage
```

---

## Tasks

- [ ] Implement `MarketEnv` (Gymnasium compatible)
- [ ] Implement `Portfolio` (position tracking, PnL, equity curve)
- [ ] Implement `PnLReward`
- [ ] Implement `SharpeReward`
- [ ] Implement `DrawdownPenaltyReward`
- [ ] Implement `CompositeReward` (weighted combination)
- [ ] Add transaction fee simulation
- [ ] Add slippage simulation
- [ ] Add leverage support
- [ ] Register env with Gymnasium: `gymnasium.register(id='CryptoTrading-v0', ...)`
- [ ] Write unit tests (known data → expected PnL)
- [ ] Render mode for visualization (optional matplotlib chart)

---

## Verification

```bash
# Run random agent for smoke test
python -c "
import gymnasium
env = MarketEnv(config)
obs, _ = env.reset()
for _ in range(100):
    action = env.action_space.sample()
    obs, reward, term, trunc, info = env.step(action)
    if term or trunc:
        break
print(f'Final portfolio: {info}')
"

# Run Stable-Baselines3 check
from stable_baselines3.common.env_checker import check_env
check_env(MarketEnv(config))

# Unit tests
python -m pytest tests/simulation/ -v
```

---

## Dependencies
- **Upstream**: Feature Engine (feature vectors), Data Pipeline (datasets)
- **Downstream**: Training Core (RL training loops)
