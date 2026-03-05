import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import trainingJobsRouter from './routes/training-jobs';
import modelsRouter from './routes/models';
import datasetsRouter from './routes/datasets';
import { setupWebSocket } from './ws/training-stream';
import { pool } from './db';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// ─── Middleware ───
app.use(cors({ origin: process.env.UI_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));

// ─── Health Check ───
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'running',
      },
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: { database: 'disconnected' },
    });
  }
});

// ─── System Status ───
app.get('/api/system/status', async (_req, res) => {
  const checks: Record<string, string> = {};

  // PostgreSQL
  try {
    await pool.query('SELECT 1');
    checks.postgres = 'connected';
  } catch {
    checks.postgres = 'disconnected';
  }

  // Ollama
  try {
    const ollamaResp = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`);
    checks.ollama = ollamaResp.ok ? 'connected' : 'error';
  } catch {
    checks.ollama = 'disconnected';
  }

  // Qdrant
  try {
    const qdrantResp = await fetch(`${process.env.QDRANT_URL || 'http://localhost:6333'}/healthz`);
    checks.qdrant = qdrantResp.ok ? 'connected' : 'error';
  } catch {
    checks.qdrant = 'disconnected';
  }

  // ClickHouse
  try {
    const chResp = await fetch(`${process.env.CLICKHOUSE_URL || 'http://localhost:8123'}/ping`);
    checks.clickhouse = chResp.ok ? 'connected' : 'error';
  } catch {
    checks.clickhouse = 'disconnected';
  }

  res.json({ services: checks, timestamp: new Date().toISOString() });
});

// ─── Routes ───
app.use('/api/training-jobs', trainingJobsRouter);
app.use('/api/models', modelsRouter);
app.use('/api/datasets', datasetsRouter);

// ─── Start Server ───
const server = createServer(app);
setupWebSocket(server);

server.listen(port, () => {
  console.log(`\n🚀 AI Training Platform API running on http://localhost:${port}`);
  console.log(`📡 WebSocket available at ws://localhost:${port}/ws`);
  console.log(`💚 Health check: http://localhost:${port}/api/health\n`);
});
