import type { TrainingJob, TrainingStatus, TrainingMetric, VALID_TRANSITIONS } from '@atp/shared';
import { query, queryOne } from '../db';

// ─── Valid state transitions ───
const TRANSITIONS: Record<string, string[]> = {
  pending:   ['queued', 'cancelled'],
  queued:    ['running', 'cancelled'],
  running:   ['paused', 'completed', 'failed', 'cancelled'],
  paused:    ['running', 'cancelled'],
  completed: [],
  failed:    ['queued'],
  cancelled: ['queued'],
};

export class TrainingService {
  // ─── List Jobs ───
  async listJobs(filters?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: TrainingJob[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters?.type) {
      conditions.push(`type = $${paramIdx++}`);
      params.push(filters.type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const [jobs, countResult] = await Promise.all([
      query<TrainingJob>(
        `SELECT * FROM training_jobs ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        [...params, limit, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM training_jobs ${where}`,
        params,
      ),
    ]);

    return { jobs, total: parseInt(countResult[0]?.count || '0', 10) };
  }

  // ─── Get Job ───
  async getJob(id: string): Promise<TrainingJob | null> {
    return queryOne<TrainingJob>('SELECT * FROM training_jobs WHERE id = $1', [id]);
  }

  // ─── Create Job ───
  async createJob(data: {
    name: string;
    type: string;
    config: Record<string, unknown>;
    model_id?: string;
  }): Promise<TrainingJob> {
    const rows = await query<TrainingJob>(
      `INSERT INTO training_jobs (name, type, config, model_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.type, JSON.stringify(data.config), data.model_id || null],
    );
    return rows[0];
  }

  // ─── Update Job ───
  async updateJob(id: string, data: Partial<{
    name: string;
    config: Record<string, unknown>;
  }>): Promise<TrainingJob | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name) {
      sets.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.config) {
      sets.push(`config = $${idx++}`);
      params.push(JSON.stringify(data.config));
    }

    params.push(id);
    return queryOne<TrainingJob>(
      `UPDATE training_jobs SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
  }

  // ─── Delete Job ───
  async deleteJob(id: string): Promise<boolean> {
    const result = await query('DELETE FROM training_jobs WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  // ─── Transition Status ───
  async transitionStatus(id: string, newStatus: string): Promise<TrainingJob> {
    const job = await this.getJob(id);
    if (!job) throw new Error(`Job ${id} not found`);

    const allowed = TRANSITIONS[job.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Cannot transition from '${job.status}' to '${newStatus}'. Allowed: ${allowed.join(', ')}`,
      );
    }

    const extras: Record<string, unknown> = { updated_at: 'NOW()' };
    if (newStatus === 'running' && !job.started_at) {
      extras.started_at = new Date().toISOString();
    }
    if (['completed', 'failed', 'cancelled'].includes(newStatus)) {
      extras.completed_at = new Date().toISOString();
    }

    const result = await queryOne<TrainingJob>(
      `UPDATE training_jobs
       SET status = $1,
           started_at = COALESCE($2::timestamptz, started_at),
           completed_at = COALESCE($3::timestamptz, completed_at),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        newStatus,
        extras.started_at || null,
        extras.completed_at || null,
        id,
      ],
    );

    if (!result) throw new Error(`Failed to update job ${id}`);
    return result;
  }

  // ─── Get Metrics ───
  async getMetrics(jobId: string, opts?: {
    limit?: number;
    since?: string;
  }): Promise<TrainingMetric[]> {
    const conditions = ['job_id = $1'];
    const params: unknown[] = [jobId];
    let idx = 2;

    if (opts?.since) {
      conditions.push(`recorded_at > $${idx++}`);
      params.push(opts.since);
    }

    const limit = opts?.limit || 500;
    params.push(limit);

    return query<TrainingMetric>(
      `SELECT * FROM training_metrics
       WHERE ${conditions.join(' AND ')}
       ORDER BY step ASC
       LIMIT $${idx}`,
      params,
    );
  }

  // ─── Add Metric ───
  async addMetric(metric: Omit<TrainingMetric, 'id' | 'recorded_at'>): Promise<void> {
    await query(
      `INSERT INTO training_metrics (job_id, step, epoch, loss, reward, win_rate, sharpe_ratio, max_drawdown, portfolio_value, extra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        metric.job_id,
        metric.step,
        metric.epoch || null,
        metric.loss ?? null,
        metric.reward ?? null,
        metric.win_rate ?? null,
        metric.sharpe_ratio ?? null,
        metric.max_drawdown ?? null,
        metric.portfolio_value ?? null,
        JSON.stringify(metric.extra || {}),
      ],
    );
  }

  // ─── Update Progress ───
  async updateProgress(id: string, progress: number): Promise<void> {
    await query(
      'UPDATE training_jobs SET progress = $1, updated_at = NOW() WHERE id = $2',
      [Math.min(Math.max(progress, 0), 100), id],
    );
  }
}

export const trainingService = new TrainingService();
