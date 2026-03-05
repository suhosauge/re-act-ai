"""Training Worker — Kafka consumer that dispatches training commands."""
import json
import logging
import threading
from typing import Optional

import numpy as np
import pandas as pd

try:
    from kafka import KafkaConsumer, KafkaProducer
except ImportError:
    KafkaConsumer = KafkaProducer = None  # type: ignore

try:
    import redis as redis_lib
except ImportError:
    redis_lib = None  # type: ignore

try:
    import psycopg2
except ImportError:
    psycopg2 = None  # type: ignore

from src.trainers.rl_trainer import RLTrainer, TrainingConfig
from src.trainers.llm_finetuner import LLMFinetuner, LLMFineTuneConfig

logger = logging.getLogger(__name__)


class TrainingWorker:
    """Kafka-driven training job executor with lifecycle management."""

    def __init__(
        self,
        kafka_brokers: str = "localhost:9092",
        redis_url: str = "redis://localhost:6379",
        pg_dsn: str = "postgresql://admin:admin123@localhost:5432/training_platform",
    ):
        self.kafka_brokers = kafka_brokers
        self.redis_url = redis_url
        self.pg_dsn = pg_dsn
        self.active_jobs: dict[str, RLTrainer | LLMFinetuner] = {}
        self.job_threads: dict[str, threading.Thread] = {}
        self._running = False

    def run(self):
        """Main loop — listen for training commands on Kafka."""
        if KafkaConsumer is None:
            logger.error("kafka-python not installed")
            return

        consumer = KafkaConsumer(
            "training.commands",
            bootstrap_servers=self.kafka_brokers,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="latest",
            group_id="training-workers",
        )

        self._running = True
        logger.info("Training worker started, listening on training.commands")

        for message in consumer:
            if not self._running:
                break
            try:
                self._handle_command(message.value)
            except Exception as e:
                logger.error(f"Error handling command: {e}")

    def _handle_command(self, cmd: dict):
        action = cmd.get("action", "")
        job_id = cmd.get("job_id", "")

        logger.info(f"Received command: {action} for job {job_id}")

        match action:
            case "start":
                self._start_job(cmd)
            case "pause":
                self._pause_job(job_id)
            case "resume":
                self._resume_job(job_id)
            case "stop":
                self._stop_job(job_id)
            case _:
                logger.warning(f"Unknown action: {action}")

    def _start_job(self, cmd: dict):
        job_id = cmd["job_id"]
        job_type = cmd.get("type", "rl_ppo")
        config = cmd.get("config", {})

        if job_type.startswith("rl_"):
            trainer_config = TrainingConfig(
                job_id=job_id,
                algorithm=job_type,
                total_timesteps=config.get("total_timesteps", 100_000),
                learning_rate=config.get("learning_rate", 3e-4),
                batch_size=config.get("batch_size", 64),
                reward_function=config.get("reward_function", "composite"),
            )
            trainer = RLTrainer(trainer_config)

            # Load dataset (mock for now)
            data = self._load_dataset(config.get("dataset_id"))
            trainer.setup(data)
            self.active_jobs[job_id] = trainer

            # Run in thread
            thread = threading.Thread(target=self._run_rl_training, args=(job_id, trainer))
            thread.start()
            self.job_threads[job_id] = thread

        elif job_type == "llm_finetune":
            llm_config = LLMFineTuneConfig(
                job_id=job_id,
                base_model=config.get("base_model", "llama3"),
            )
            finetuner = LLMFinetuner(llm_config)
            self.active_jobs[job_id] = finetuner

            thread = threading.Thread(target=self._run_llm_training, args=(job_id, finetuner, config))
            thread.start()
            self.job_threads[job_id] = thread

        self._update_status(job_id, "running")

    def _run_rl_training(self, job_id: str, trainer: RLTrainer):
        try:
            results = trainer.train()
            self._update_status(job_id, "completed", results)
            logger.info(f"[{job_id}] Training completed: {results}")
        except Exception as e:
            self._update_status(job_id, "failed", {"error": str(e)})
            logger.error(f"[{job_id}] Training failed: {e}")
        finally:
            self.active_jobs.pop(job_id, None)
            self.job_threads.pop(job_id, None)

    def _run_llm_training(self, job_id: str, finetuner: LLMFinetuner, config: dict):
        try:
            trades = config.get("trades", [])
            results = finetuner.train(trades)
            status = "completed" if results.get("status") == "completed" else "failed"
            self._update_status(job_id, status, results)
        except Exception as e:
            self._update_status(job_id, "failed", {"error": str(e)})
        finally:
            self.active_jobs.pop(job_id, None)
            self.job_threads.pop(job_id, None)

    def _pause_job(self, job_id: str):
        trainer = self.active_jobs.get(job_id)
        if trainer and hasattr(trainer, 'pause'):
            trainer.pause()
            self._update_status(job_id, "paused")

    def _resume_job(self, job_id: str):
        trainer = self.active_jobs.get(job_id)
        if trainer and hasattr(trainer, 'resume'):
            trainer.resume()
            self._update_status(job_id, "running")

    def _stop_job(self, job_id: str):
        trainer = self.active_jobs.get(job_id)
        if trainer and hasattr(trainer, 'stop'):
            trainer.stop()
            self._update_status(job_id, "cancelled")

    def _update_status(self, job_id: str, status: str, data: dict | None = None):
        """Publish status update via Redis."""
        if redis_lib:
            try:
                r = redis_lib.from_url(self.redis_url)
                r.publish(f"training:{job_id}:status", json.dumps({
                    "job_id": job_id,
                    "status": status,
                    "data": data or {},
                }))
            except Exception:
                pass

    def _load_dataset(self, dataset_id: str | None) -> pd.DataFrame:
        """Load dataset from ClickHouse or generate mock data."""
        # For now, generate mock OHLCV data
        n = 2000
        dates = pd.date_range("2024-01-01", periods=n, freq="h")
        np.random.seed(42)
        price = 40000.0
        prices = []
        for _ in range(n):
            price *= 1 + np.random.randn() * 0.002
            prices.append(price)

        return pd.DataFrame({
            "timestamp": dates,
            "open": prices,
            "high": [p * (1 + abs(np.random.randn()) * 0.001) for p in prices],
            "low": [p * (1 - abs(np.random.randn()) * 0.001) for p in prices],
            "close": [p * (1 + np.random.randn() * 0.0005) for p in prices],
            "volume": np.random.uniform(100, 10000, n),
        })

    def stop(self):
        self._running = False
        for job_id in list(self.active_jobs):
            self._stop_job(job_id)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    worker = TrainingWorker()
    worker.run()
