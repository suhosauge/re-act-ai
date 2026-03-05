import type { Model, ModelVersion } from '@atp/shared';
import { query, queryOne } from '../db';

export class ModelService {
  async listModels(filters?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ models: Model[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters?.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters?.type) {
      conditions.push(`type = $${idx++}`);
      params.push(filters.type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const [models, countResult] = await Promise.all([
      query<Model>(
        `SELECT * FROM models ${where} ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx}`,
        [...params, limit, offset],
      ),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM models ${where}`, params),
    ]);

    return { models, total: parseInt(countResult[0]?.count || '0', 10) };
  }

  async getModel(id: string): Promise<Model | null> {
    return queryOne<Model>('SELECT * FROM models WHERE id = $1', [id]);
  }

  async createModel(data: {
    name: string;
    type: string;
    description?: string;
    tags?: string[];
  }): Promise<Model> {
    const rows = await query<Model>(
      `INSERT INTO models (name, type, description, tags) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.type, data.description || null, JSON.stringify(data.tags || [])],
    );
    return rows[0];
  }

  async updateModelStatus(id: string, status: string): Promise<Model | null> {
    return queryOne<Model>(
      'UPDATE models SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id],
    );
  }

  async getVersions(modelId: string): Promise<ModelVersion[]> {
    return query<ModelVersion>(
      'SELECT * FROM model_versions WHERE model_id = $1 ORDER BY version DESC',
      [modelId],
    );
  }

  async createVersion(data: {
    model_id: string;
    checkpoint_path?: string;
    metrics?: Record<string, unknown>;
  }): Promise<ModelVersion> {
    // Get next version number
    const latest = await queryOne<{ max_version: number }>(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM model_versions WHERE model_id = $1',
      [data.model_id],
    );
    const nextVersion = (latest?.max_version || 0) + 1;

    const rows = await query<ModelVersion>(
      `INSERT INTO model_versions (model_id, version, checkpoint_path, metrics)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.model_id, nextVersion, data.checkpoint_path || null, JSON.stringify(data.metrics || {})],
    );
    return rows[0];
  }

  async deployVersion(modelId: string, versionId: string): Promise<void> {
    // Un-deploy all versions first, then deploy the selected one
    await query('UPDATE model_versions SET is_deployed = false WHERE model_id = $1', [modelId]);
    await query('UPDATE model_versions SET is_deployed = true WHERE id = $1', [versionId]);
    await query("UPDATE models SET status = 'deployed', updated_at = NOW() WHERE id = $1", [modelId]);
  }
}

export const modelService = new ModelService();
