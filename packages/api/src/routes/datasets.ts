import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import type { Dataset } from '@atp/shared';

const router = Router();

// ─── List Datasets ───
router.get('/', async (req: Request, res: Response) => {
  try {
    const datasets = await query<Dataset>(
      'SELECT * FROM datasets ORDER BY created_at DESC LIMIT 50',
    );
    res.json(datasets);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Create Dataset ───
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, symbols, timeframe, start_date, end_date, feature_config } = req.body;
    if (!name || !symbols || !start_date || !end_date) {
      return res.status(400).json({ error: 'name, symbols, start_date, end_date are required' });
    }
    const rows = await query<Dataset>(
      `INSERT INTO datasets (name, symbols, timeframe, start_date, end_date, feature_config)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, JSON.stringify(symbols), timeframe || '1h', start_date, end_date, JSON.stringify(feature_config || {})],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Get Dataset ───
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const dataset = await queryOne<Dataset>('SELECT * FROM datasets WHERE id = $1', [req.params.id]);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    res.json(dataset);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Get Config Templates ───
router.get('/configs/templates', async (_req: Request, res: Response) => {
  try {
    const templates = await query('SELECT * FROM training_configs WHERE is_template = true ORDER BY name');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
