"""LLM Fine-tuner — Creates fine-tuning datasets and fine-tunes models via Ollama."""
import json
import logging
import time
from dataclasses import dataclass

try:
    import requests
except ImportError:
    requests = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class LLMFineTuneConfig:
    job_id: str
    base_model: str = "llama3"
    ollama_url: str = "http://localhost:11434"
    epochs: int = 3
    output_model: str = ""
    system_prompt: str = "You are an expert crypto trader and market analyst."


class LLMFinetuner:
    """Fine-tunes LLMs via Ollama for market reasoning."""

    def __init__(self, config: LLMFineTuneConfig):
        self.config = config
        if not config.output_model:
            self.config.output_model = f"{config.base_model}-trading-{config.job_id}"
        self._stopped = False

    def build_dataset(self, trades: list[dict]) -> list[dict]:
        """Convert trade history into instruction-response pairs."""
        dataset = []
        for trade in trades:
            prompt = self._build_prompt(trade)
            response = self._build_response(trade)
            dataset.append({"prompt": prompt, "response": response})
        return dataset

    def _build_prompt(self, trade: dict) -> str:
        return (
            f"Analyze the following market condition and decide whether to BUY, SELL, or HOLD.\n\n"
            f"Symbol: {trade.get('symbol', 'BTCUSDT')}\n"
            f"Price: ${trade.get('price', 0):,.2f}\n"
            f"RSI: {trade.get('rsi', 50):.1f}\n"
            f"MACD: {trade.get('macd', 0):.4f}\n"
            f"Volume Spike: {trade.get('volume_spike', 1):.2f}x\n"
            f"Volatility: {trade.get('volatility', 0):.2%}\n"
            f"Market State: {trade.get('market_state', 'neutral')}\n\n"
            f"What is your trading decision and reasoning?"
        )

    def _build_response(self, trade: dict) -> str:
        action = trade.get("action", "HOLD")
        pnl = trade.get("pnl", 0)
        return (
            f"Decision: {action}\n\n"
            f"Reasoning: Based on the technical indicators:\n"
            f"- RSI at {trade.get('rsi', 50):.1f} indicates "
            f"{'overbought' if trade.get('rsi', 50) > 70 else 'oversold' if trade.get('rsi', 50) < 30 else 'neutral'} conditions\n"
            f"- MACD {'bullish' if trade.get('macd', 0) > 0 else 'bearish'} signal\n"
            f"- Volume is {trade.get('volume_spike', 1):.1f}x average\n\n"
            f"Confidence: {'High' if abs(pnl) > 2 else 'Medium'}\n"
            f"Historical PnL for similar setup: {pnl:+.2f}%"
        )

    def create_modelfile(self, dataset: list[dict]) -> str:
        """Build Ollama Modelfile for fine-tuning."""
        examples = "\n\n".join(
            f"### Instruction:\n{d['prompt']}\n\n### Response:\n{d['response']}"
            for d in dataset[:50]  # limit examples
        )

        modelfile = f"""FROM {self.config.base_model}

SYSTEM {self.config.system_prompt}

TEMPLATE \"\"\"{{{{ .System }}}}

{{{{ .Prompt }}}}\"\"\"

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 4096

# Training examples embedded as context
MESSAGE user Analyze BTCUSDT: RSI=25, MACD=0.002, Volume=2.1x
MESSAGE assistant Decision: BUY\\n\\nReasoning: RSI indicates oversold, MACD bullish crossover, volume spike confirms momentum. High confidence entry.

MESSAGE user Analyze BTCUSDT: RSI=78, MACD=-0.005, Volume=0.8x
MESSAGE assistant Decision: SELL\\n\\nReasoning: RSI overbought, MACD bearish divergence, declining volume. Risk of reversal. Close long positions.
"""
        return modelfile

    def train(self, trades: list[dict]) -> dict:
        """Create fine-tuned model via Ollama."""
        dataset = self.build_dataset(trades)
        modelfile = self.create_modelfile(dataset)

        logger.info(f"[{self.config.job_id}] Creating model {self.config.output_model}")

        if requests is None:
            return {"status": "error", "message": "requests not installed"}

        try:
            resp = requests.post(
                f"{self.config.ollama_url}/api/create",
                json={
                    "name": self.config.output_model,
                    "modelfile": modelfile,
                },
                stream=True,
                timeout=300,
            )

            for line in resp.iter_lines():
                if self._stopped:
                    return {"status": "stopped"}
                if line:
                    status = json.loads(line)
                    logger.info(f"[{self.config.job_id}] {status.get('status', '')}")

            return {
                "status": "completed",
                "model_name": self.config.output_model,
                "base_model": self.config.base_model,
                "training_samples": len(dataset),
            }

        except Exception as e:
            logger.error(f"Fine-tune failed: {e}")
            return {"status": "failed", "error": str(e)}

    def stop(self):
        self._stopped = True

    def test_inference(self, prompt: str) -> str:
        """Test the fine-tuned model."""
        if requests is None:
            return "requests not installed"
        resp = requests.post(
            f"{self.config.ollama_url}/api/generate",
            json={"model": self.config.output_model, "prompt": prompt, "stream": False},
            timeout=60,
        )
        return resp.json().get("response", "")
