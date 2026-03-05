import { Router, Request, Response } from 'express';
import { trainingService } from '../services/training-service';

const router = Router();

// ─── List Training Jobs ───
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, limit, offset } = req.query;
    const result = await trainingService.listJobs({
      status: status as string,
      type: type as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Get Training Job ───
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await trainingService.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Create Training Job ───
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, config, model_id } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }
    const job = await trainingService.createJob({ name, type, config: config || {}, model_id });
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Update Training Job ───
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const job = await trainingService.updateJob(req.params.id, req.body);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Delete Training Job ───
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await trainingService.deleteJob(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Lifecycle Actions ───
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    // First queue, then move to running
    let job = await trainingService.transitionStatus(req.params.id, 'queued');
    job = await trainingService.transitionStatus(req.params.id, 'running');
    res.json(job);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const job = await trainingService.transitionStatus(req.params.id, 'paused');
    res.json(job);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const job = await trainingService.transitionStatus(req.params.id, 'running');
    res.json(job);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const job = await trainingService.transitionStatus(req.params.id, 'cancelled');
    res.json(job);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ─── Metrics ───
router.get('/:id/metrics', async (req: Request, res: Response) => {
  try {
    const { limit, since } = req.query;
    const metrics = await trainingService.getMetrics(req.params.id, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      since: since as string,
    });
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
