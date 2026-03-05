"""RL Trainer — Stable-Baselines3 wrapper with lifecycle management."""
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

try:
    from stable_baselines3 import PPO, DQN, SAC
    from stable_baselines3.common.callbacks import BaseCallback, EvalCallback
except ImportError:
    PPO = DQN = SAC = None  # type: ignore
    BaseCallback = object  # type: ignore

try:
    import redis
except ImportError:
    redis = None  # type: ignore

from src.simulation.market_env import MarketEnv, EnvConfig

logger = logging.getLogger(__name__)

ALGORITHMS = {
    "rl_ppo": PPO,
    "rl_dqn": DQN,
    "rl_sac": SAC,
}


@dataclass
class TrainingConfig:
    job_id: str
    algorithm: str = "rl_ppo"
    total_timesteps: int = 100_000
    learning_rate: float = 3e-4
    batch_size: int = 64
    n_steps: int = 2048           # PPO only
    gamma: float = 0.99
    net_arch: list[int] | None = None
    reward_function: str = "composite"
    checkpoint_dir: str = "./checkpoints"
    checkpoint_freq: int = 10_000
    # Dataset
    dataset_path: str = ""
    features: list[str] | None = None
    initial_capital: float = 10_000
    fee_rate: float = 0.001


class MetricsCallback(BaseCallback):
    """SB3 callback that reports metrics via Redis pub/sub + stores in buffer."""

    def __init__(self, job_id: str, redis_url: str = "redis://localhost:6379", report_freq: int = 100):
        super().__init__()
        self.job_id = job_id
        self.report_freq = report_freq
        self.metrics_buffer: list[dict] = []
        self._redis = None
        self._paused = False
        self._stopped = False

        try:
            if redis:
                self._redis = redis.from_url(redis_url)
        except Exception:
            logger.warning("Redis not available for metrics reporting")

    def _on_step(self) -> bool:
        if self._stopped:
            return False

        while self._paused:
            import time
            time.sleep(1)
            if self._stopped:
                return False

        if self.num_timesteps % self.report_freq == 0:
            info = self.locals.get("infos", [{}])[0] if self.locals.get("infos") else {}
            metrics = {
                "step": self.num_timesteps,
                "loss": float(self.logger.name_to_value.get("train/loss", 0)),
                "reward": float(info.get("total_return", 0)),
                "win_rate": float(info.get("win_rate", 0)),
                "portfolio_value": float(info.get("equity", 10000)),
                "sharpe_ratio": float(info.get("sharpe_ratio", 0)),
                "max_drawdown": float(info.get("max_drawdown", 0)),
                "trades": int(info.get("trades", 0)),
            }
            self.metrics_buffer.append(metrics)

            # Publish to Redis
            if self._redis:
                try:
                    self._redis.publish(
                        f"training:{self.job_id}:metrics",
                        json.dumps(metrics)
                    )
                except Exception:
                    pass

        return True


class RLTrainer:
    """Wraps Stable-Baselines3 with pause/resume/stop lifecycle."""

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.callback: Optional[MetricsCallback] = None
        self.model = None
        self.env = None

    def setup(self, data: pd.DataFrame):
        """Initialize environment and model."""
        env_cfg = EnvConfig(
            initial_capital=self.config.initial_capital,
            fee_rate=self.config.fee_rate,
            features=self.config.features or [],
            reward_function=self.config.reward_function,
        )
        self.env = MarketEnv(data, env_cfg)

        algo_cls = ALGORITHMS.get(self.config.algorithm)
        if algo_cls is None:
            raise ValueError(f"Unknown algorithm: {self.config.algorithm}")

        kwargs = {
            "policy": "MlpPolicy",
            "env": self.env,
            "learning_rate": self.config.learning_rate,
            "batch_size": self.config.batch_size,
            "gamma": self.config.gamma,
            "verbose": 0,
        }
        if self.config.algorithm == "rl_ppo":
            kwargs["n_steps"] = self.config.n_steps
        if self.config.net_arch:
            kwargs["policy_kwargs"] = {"net_arch": self.config.net_arch}

        self.model = algo_cls(**kwargs)
        self.callback = MetricsCallback(self.config.job_id)

        logger.info(f"[{self.config.job_id}] Setup complete: {self.config.algorithm}")

    def train(self) -> dict:
        """Run training loop. Returns final metrics."""
        if self.model is None:
            raise RuntimeError("Call setup() before train()")

        checkpoint_dir = Path(self.config.checkpoint_dir) / self.config.job_id
        checkpoint_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"[{self.config.job_id}] Starting training: {self.config.total_timesteps} steps")

        self.model.learn(
            total_timesteps=self.config.total_timesteps,
            callback=self.callback,
            progress_bar=False,
        )

        # Save final checkpoint
        final_path = checkpoint_dir / "final_model"
        self.model.save(str(final_path))
        logger.info(f"[{self.config.job_id}] Saved final model to {final_path}")

        # Evaluate
        results = self.evaluate()
        results["checkpoint_path"] = str(final_path)
        return results

    def evaluate(self, n_episodes: int = 5) -> dict:
        """Evaluate the trained model."""
        if self.model is None or self.env is None:
            return {}

        all_returns = []
        all_sharpe = []
        all_drawdown = []
        all_win_rate = []

        for _ in range(n_episodes):
            obs, _ = self.env.reset()
            done = False
            while not done:
                action, _ = self.model.predict(obs, deterministic=True)
                obs, _, terminated, truncated, info = self.env.step(int(action))
                done = terminated or truncated
            all_returns.append(info.get("total_return", 0))
            all_sharpe.append(info.get("sharpe_ratio", 0))
            all_drawdown.append(info.get("max_drawdown", 0))
            all_win_rate.append(info.get("win_rate", 0))

        return {
            "total_return": float(np.mean(all_returns)),
            "sharpe_ratio": float(np.mean(all_sharpe)),
            "max_drawdown": float(np.mean(all_drawdown)),
            "win_rate": float(np.mean(all_win_rate)),
        }

    def pause(self):
        if self.callback:
            self.callback._paused = True

    def resume(self):
        if self.callback:
            self.callback._paused = False

    def stop(self):
        if self.callback:
            self.callback._stopped = True

    def load(self, path: str):
        algo_cls = ALGORITHMS.get(self.config.algorithm)
        if algo_cls:
            self.model = algo_cls.load(path, env=self.env)
