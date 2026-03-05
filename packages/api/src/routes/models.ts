import { Router, Request, Response } from 'express';
import { modelService } from '../services/model-service';

const router = Router();

// ─── List Models ───
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, limit, offset } = req.query;
    const result = await modelService.listModels({
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

// ─── Get Model ───
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const model = await modelService.getModel(req.params.id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Create Model ───
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, description, tags } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }
    const model = await modelService.createModel({ name, type, description, tags });
    res.status(201).json(model);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Get Versions ───
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await modelService.getVersions(req.params.id);
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Deploy Version ───
router.post('/:id/deploy', async (req: Request, res: Response) => {
  try {
    const { version_id } = req.body;
    if (!version_id) return res.status(400).json({ error: 'version_id is required' });
    await modelService.deployVersion(req.params.id, version_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Archive Model ───
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const model = await modelService.updateModelStatus(req.params.id, 'archived');
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
