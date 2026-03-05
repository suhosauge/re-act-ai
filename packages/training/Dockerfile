FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY packages/training/pyproject.toml ./
RUN pip install --no-cache-dir -e ".[dev]" 2>/dev/null || pip install --no-cache-dir numpy pandas torch gymnasium stable-baselines3 clickhouse-connect qdrant-client kafka-python redis requests pydantic pyarrow ta websockets

COPY packages/training/ .

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "src.workers.training_worker"]
