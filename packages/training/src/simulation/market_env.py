"""Market simulation environment — Gymnasium compatible."""
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional

try:
    import gymnasium as gym
    from gymnasium import spaces
except ImportError:
    gym = None  # type: ignore
    spaces = None  # type: ignore

from src.features.indicators import FeaturePipeline


# ─── Actions ───
HOLD = 0
BUY = 1
SELL = 2
SHORT = 3
CLOSE = 4
ACTION_NAMES = {0: "HOLD", 1: "BUY", 2: "SELL", 3: "SHORT", 4: "CLOSE"}


@dataclass
class EnvConfig:
    """Configuration for the market environment."""
    initial_capital: float = 10_000.0
    fee_rate: float = 0.001          # 0.1%
    slippage: float = 0.0005         # 0.05%
    max_steps: int = 1000
    reward_function: str = "composite"
    leverage: float = 1.0
    features: list[str] = field(default_factory=lambda: FeaturePipeline.DEFAULT_FEATURES)


class Portfolio:
    """Tracks positions, PnL, and equity curve."""

    def __init__(self, initial_capital: float):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.position = 0.0        # +N long, -N short, 0 flat
        self.entry_price = 0.0
        self.equity_curve: list[float] = [initial_capital]
        self.trades: list[dict] = []
        self._peak = initial_capital

    def reset(self):
        self.cash = self.initial_capital
        self.position = 0.0
        self.entry_price = 0.0
        self.equity_curve = [self.initial_capital]
        self.trades = []
        self._peak = self.initial_capital

    def execute(self, action: int, price: float, fee_rate: float, slippage: float = 0):
        effective_price = price * (1 + slippage) if action in (BUY,) else price * (1 - slippage)

        if action == BUY and self.position <= 0:
            # Close short if any, then go long
            if self.position < 0:
                self._close_position(effective_price, fee_rate)
            size = self.cash / effective_price
            cost = size * effective_price * fee_rate
            self.position = size
            self.entry_price = effective_price
            self.cash -= cost

        elif action == SELL and self.position > 0:
            self._close_position(effective_price, fee_rate)

        elif action == SHORT and self.position >= 0:
            if self.position > 0:
                self._close_position(effective_price, fee_rate)
            size = self.cash / effective_price
            cost = size * effective_price * fee_rate
            self.position = -size
            self.entry_price = effective_price
            self.cash -= cost

        elif action == CLOSE and self.position != 0:
            self._close_position(effective_price, fee_rate)

        # Update equity
        equity = self.get_equity(price)
        self.equity_curve.append(equity)
        self._peak = max(self._peak, equity)

    def _close_position(self, price: float, fee_rate: float):
        if self.position > 0:
            pnl = self.position * (price - self.entry_price)
        else:
            pnl = abs(self.position) * (self.entry_price - price)
        cost = abs(self.position) * price * fee_rate
        self.cash += pnl - cost
        self.trades.append({
            "entry": self.entry_price,
            "exit": price,
            "pnl": pnl - cost,
            "side": "long" if self.position > 0 else "short",
        })
        self.position = 0.0
        self.entry_price = 0.0

    def get_equity(self, current_price: float) -> float:
        if self.position > 0:
            return self.cash + self.position * current_price
        elif self.position < 0:
            unrealized = abs(self.position) * (self.entry_price - current_price)
            return self.cash + unrealized
        return self.cash

    @property
    def total_return(self) -> float:
        return (self.equity_curve[-1] / self.initial_capital - 1) * 100

    @property
    def max_drawdown(self) -> float:
        peaks = np.maximum.accumulate(self.equity_curve)
        drawdowns = (np.array(self.equity_curve) - peaks) / (peaks + 1e-10)
        return float(np.min(drawdowns)) * 100

    @property
    def sharpe_ratio(self) -> float:
        if len(self.equity_curve) < 2:
            return 0.0
        returns = np.diff(self.equity_curve) / (np.array(self.equity_curve[:-1]) + 1e-10)
        if np.std(returns) < 1e-10:
            return 0.0
        return float(np.mean(returns) / np.std(returns) * np.sqrt(252))

    @property
    def win_rate(self) -> float:
        if not self.trades:
            return 0.0
        wins = sum(1 for t in self.trades if t["pnl"] > 0)
        return wins / len(self.trades) * 100

    @property
    def is_bankrupt(self) -> bool:
        return self.cash <= 0 or (len(self.equity_curve) > 0 and self.equity_curve[-1] < self.initial_capital * 0.1)

    @property
    def portfolio_state(self) -> np.ndarray:
        equity = self.equity_curve[-1] if self.equity_curve else self.initial_capital
        return np.array([
            self.position,
            (equity / self.initial_capital) - 1,  # unrealized return
            self.cash / self.initial_capital,      # cash ratio
            self.max_drawdown / 100,               # drawdown factor
        ], dtype=np.float32)


# ─── Reward Functions ───

class RewardFunction:
    def compute(self, portfolio: Portfolio, step: int) -> float:
        raise NotImplementedError

class PnLReward(RewardFunction):
    def compute(self, portfolio: Portfolio, step: int) -> float:
        if len(portfolio.equity_curve) < 2:
            return 0.0
        return (portfolio.equity_curve[-1] - portfolio.equity_curve[-2]) / portfolio.initial_capital

class SharpeReward(RewardFunction):
    def __init__(self, window: int = 20):
        self.window = window
    def compute(self, portfolio: Portfolio, step: int) -> float:
        if len(portfolio.equity_curve) < self.window:
            return 0.0
        recent = portfolio.equity_curve[-self.window:]
        returns = np.diff(recent) / (np.array(recent[:-1]) + 1e-10)
        if np.std(returns) < 1e-10:
            return 0.0
        return float(np.mean(returns) / np.std(returns))

class DrawdownPenaltyReward(RewardFunction):
    def __init__(self, penalty: float = 0.5):
        self.penalty = penalty
    def compute(self, portfolio: Portfolio, step: int) -> float:
        pnl = PnLReward().compute(portfolio, step)
        dd = abs(portfolio.max_drawdown) / 100
        return pnl - self.penalty * dd

class CompositeReward(RewardFunction):
    def __init__(self, w_pnl: float = 0.5, w_sharpe: float = 0.3, w_dd: float = 0.2):
        self.pnl_fn = PnLReward()
        self.sharpe_fn = SharpeReward()
        self.w_pnl = w_pnl
        self.w_sharpe = w_sharpe
        self.w_dd = w_dd
    def compute(self, portfolio: Portfolio, step: int) -> float:
        pnl = self.pnl_fn.compute(portfolio, step)
        sharpe = self.sharpe_fn.compute(portfolio, step)
        dd = abs(portfolio.max_drawdown) / 100
        return self.w_pnl * pnl + self.w_sharpe * sharpe * 0.1 - self.w_dd * dd

REWARD_FUNCTIONS: dict[str, type[RewardFunction]] = {
    "pnl": PnLReward,
    "sharpe": SharpeReward,
    "drawdown_penalty": DrawdownPenaltyReward,
    "composite": CompositeReward,
}


# ─── Gymnasium Environment ───

class MarketEnv(gym.Env):
    """Trading environment compatible with Gymnasium and Stable-Baselines3."""

    metadata = {"render_modes": ["human"]}

    def __init__(self, data: pd.DataFrame, config: Optional[EnvConfig] = None):
        super().__init__()
        self.config = config or EnvConfig()
        self.raw_data = data.reset_index(drop=True)

        # Build features
        self.pipeline = FeaturePipeline(self.config.features)
        self.features = self.pipeline.fit_transform(self.raw_data)
        self.n_features = self.features.shape[1]

        # Spaces
        obs_dim = self.n_features + 4  # features + portfolio state
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(obs_dim,), dtype=np.float32
        )
        self.action_space = spaces.Discrete(5)

        # State
        self.portfolio = Portfolio(self.config.initial_capital)
        self.current_step = 0
        self.reward_fn = REWARD_FUNCTIONS.get(
            self.config.reward_function, CompositeReward
        )()

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step = 0
        self.portfolio.reset()
        return self._get_obs(), self._get_info()

    def step(self, action: int):
        price = float(self.raw_data.iloc[self.current_step]["close"])
        self.portfolio.execute(action, price, self.config.fee_rate, self.config.slippage)
        self.current_step += 1

        reward = self.reward_fn.compute(self.portfolio, self.current_step)
        terminated = self.current_step >= min(len(self.raw_data) - 1, self.config.max_steps)
        truncated = self.portfolio.is_bankrupt

        return self._get_obs(), reward, terminated, truncated, self._get_info()

    def _get_obs(self) -> np.ndarray:
        step = min(self.current_step, len(self.features) - 1)
        feature_obs = self.features[step].astype(np.float32)
        portfolio_obs = self.portfolio.portfolio_state
        return np.concatenate([feature_obs, portfolio_obs])

    def _get_info(self) -> dict:
        return {
            "step": self.current_step,
            "equity": self.portfolio.equity_curve[-1],
            "total_return": self.portfolio.total_return,
            "max_drawdown": self.portfolio.max_drawdown,
            "sharpe_ratio": self.portfolio.sharpe_ratio,
            "win_rate": self.portfolio.win_rate,
            "trades": len(self.portfolio.trades),
            "position": self.portfolio.position,
        }
