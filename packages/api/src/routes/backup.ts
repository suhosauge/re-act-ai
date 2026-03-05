import { query } from '../db/index';
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

// ─── Types ───

interface BackupMetadata {
  id: string;
  timestamp: string;
  components: string[];
  size_bytes: number;
  status: 'completed' | 'failed' | 'in_progress';
  notes?: string;
}

// ─── Backup Service ───

export class BackupService {
  private pgUrl: string;
  private clickhouseHost: string;
  private clickhousePort: string;
  private qdrantUrl: string;

  constructor() {
    this.pgUrl = process.env.DATABASE_URL || 'postgresql://admin:admin123@localhost:5432/training_platform';
    this.clickhouseHost = process.env.CLICKHOUSE_HOST || 'localhost';
    this.clickhousePort = process.env.CLICKHOUSE_PORT || '8123';
    this.qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  }

  // ─── Full System Backup ───

  async backupAll(notes?: string): Promise<BackupMetadata> {
    const id = `backup_${Date.now()}`;
    const backupPath = path.join(BACKUP_DIR, id);
    fs.mkdirSync(backupPath, { recursive: true });

    const components: string[] = [];
    let totalSize = 0;

    try {
      // 1. PostgreSQL
      const pgSize = await this.backupPostgres(backupPath);
      components.push('postgres');
      totalSize += pgSize;

      // 2. ClickHouse
      const chSize = await this.backupClickHouse(backupPath);
      components.push('clickhouse');
      totalSize += chSize;

      // 3. Qdrant collections
      const qdSize = await this.backupQdrant(backupPath);
      components.push('qdrant');
      totalSize += qdSize;

      // 4. Model checkpoints
      const cpSize = await this.backupCheckpoints(backupPath);
      components.push('checkpoints');
      totalSize += cpSize;

      // 5. Save metadata
      const metadata: BackupMetadata = {
        id,
        timestamp: new Date().toISOString(),
        components,
        size_bytes: totalSize,
        status: 'completed',
        notes,
      };
      fs.writeFileSync(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2));

      return metadata;
    } catch (err: any) {
      const metadata: BackupMetadata = {
        id,
        timestamp: new Date().toISOString(),
        components,
        size_bytes: totalSize,
        status: 'failed',
        notes: err.message,
      };
      fs.writeFileSync(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
      throw err;
    }
  }

  // ─── PostgreSQL Backup ───

  async backupPostgres(backupPath: string): Promise<number> {
    const outFile = path.join(backupPath, 'postgres.sql');

    // Export all tables as JSON (portable, no pg_dump dependency)
    const tables = ['models', 'model_versions', 'training_jobs', 'training_metrics', 'training_configs', 'datasets'];
    const dump: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        dump[table] = await query(`SELECT * FROM ${table}`);
      } catch {
        dump[table] = [];
      }
    }

    const content = JSON.stringify(dump, null, 2);
    fs.writeFileSync(path.join(backupPath, 'postgres.json'), content);
    return Buffer.byteLength(content);
  }

  // ─── ClickHouse Backup ───

  async backupClickHouse(backupPath: string): Promise<number> {
    const chDir = path.join(backupPath, 'clickhouse');
    fs.mkdirSync(chDir, { recursive: true });

    const tables = ['ohlcv', 'trades', 'orderbook', 'features'];
    let totalSize = 0;

    for (const table of tables) {
      try {
        const url = `http://${this.clickhouseHost}:${this.clickhousePort}/?query=SELECT * FROM market_data.${table} FORMAT JSONEachRow`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.text();
          const filePath = path.join(chDir, `${table}.jsonl`);
          fs.writeFileSync(filePath, data);
          totalSize += Buffer.byteLength(data);
        }
      } catch {
        // Table might be empty or not exist
      }
    }
    return totalSize;
  }

  // ─── Qdrant Backup ───

  async backupQdrant(backupPath: string): Promise<number> {
    const qdDir = path.join(backupPath, 'qdrant');
    fs.mkdirSync(qdDir, { recursive: true });

    try {
      // Get all collections
      const resp = await fetch(`${this.qdrantUrl}/collections`);
      if (!resp.ok) return 0;
      const { result } = await resp.json();
      let totalSize = 0;

      for (const col of result.collections || []) {
        const name = col.name;

        // Create snapshot
        const snapResp = await fetch(`${this.qdrantUrl}/collections/${name}/snapshots`, { method: 'POST' });
        if (!snapResp.ok) continue;
        const snapData = await snapResp.json();
        const snapName = snapData.result?.name;

        if (snapName) {
          // Download snapshot
          const dlResp = await fetch(`${this.qdrantUrl}/collections/${name}/snapshots/${snapName}`);
          if (dlResp.ok) {
            const buffer = Buffer.from(await dlResp.arrayBuffer());
            const filePath = path.join(qdDir, `${name}.snapshot`);
            fs.writeFileSync(filePath, buffer);
            totalSize += buffer.length;
          }
        }
      }
      return totalSize;
    } catch {
      return 0;
    }
  }

  // ─── Checkpoints Backup ───

  async backupCheckpoints(backupPath: string): Promise<number> {
    const srcDir = process.env.CHECKPOINT_DIR || './checkpoints';
    const destDir = path.join(backupPath, 'checkpoints');

    if (!fs.existsSync(srcDir)) return 0;

    try {
      await execAsync(`cp -r "${srcDir}" "${destDir}"`);
      const { stdout } = await execAsync(`du -sb "${destDir}" | cut -f1`);
      return parseInt(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  // ─── Full System Restore ───

  async restoreAll(backupId: string): Promise<{ restored: string[]; errors: string[] }> {
    const backupPath = path.join(BACKUP_DIR, backupId);
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const metadataFile = path.join(backupPath, 'metadata.json');
    if (!fs.existsSync(metadataFile)) {
      throw new Error(`Invalid backup: missing metadata.json`);
    }

    const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
    const restored: string[] = [];
    const errors: string[] = [];

    // 1. Restore PostgreSQL
    if (metadata.components.includes('postgres')) {
      try {
        await this.restorePostgres(backupPath);
        restored.push('postgres');
      } catch (err: any) {
        errors.push(`postgres: ${err.message}`);
      }
    }

    // 2. Restore ClickHouse
    if (metadata.components.includes('clickhouse')) {
      try {
        await this.restoreClickHouse(backupPath);
        restored.push('clickhouse');
      } catch (err: any) {
        errors.push(`clickhouse: ${err.message}`);
      }
    }

    // 3. Restore Qdrant
    if (metadata.components.includes('qdrant')) {
      try {
        await this.restoreQdrant(backupPath);
        restored.push('qdrant');
      } catch (err: any) {
        errors.push(`qdrant: ${err.message}`);
      }
    }

    // 4. Restore Checkpoints
    if (metadata.components.includes('checkpoints')) {
      try {
        await this.restoreCheckpoints(backupPath);
        restored.push('checkpoints');
      } catch (err: any) {
        errors.push(`checkpoints: ${err.message}`);
      }
    }

    return { restored, errors };
  }

  // ─── PostgreSQL Restore ───

  async restorePostgres(backupPath: string): Promise<void> {
    const filePath = path.join(backupPath, 'postgres.json');
    if (!fs.existsSync(filePath)) return;

    const dump: Record<string, any[]> = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Restore order matters (foreign keys)
    const restoreOrder = ['models', 'model_versions', 'training_configs', 'datasets', 'training_jobs', 'training_metrics'];

    for (const table of restoreOrder) {
      const rows = dump[table];
      if (!rows || rows.length === 0) continue;

      // Clear existing data
      await query(`DELETE FROM ${table}`);

      // Insert rows
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        await query(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      }
    }
  }

  // ─── ClickHouse Restore ───

  async restoreClickHouse(backupPath: string): Promise<void> {
    const chDir = path.join(backupPath, 'clickhouse');
    if (!fs.existsSync(chDir)) return;

    const tables = ['ohlcv', 'trades', 'orderbook', 'features'];
    for (const table of tables) {
      const filePath = path.join(chDir, `${table}.jsonl`);
      if (!fs.existsSync(filePath)) continue;

      const data = fs.readFileSync(filePath, 'utf-8');
      if (!data.trim()) continue;

      const url = `http://${this.clickhouseHost}:${this.clickhousePort}/?query=INSERT INTO market_data.${table} FORMAT JSONEachRow`;
      await fetch(url, { method: 'POST', body: data });
    }
  }

  // ─── Qdrant Restore ───

  async restoreQdrant(backupPath: string): Promise<void> {
    const qdDir = path.join(backupPath, 'qdrant');
    if (!fs.existsSync(qdDir)) return;

    const files = fs.readdirSync(qdDir).filter(f => f.endsWith('.snapshot'));
    for (const file of files) {
      const collectionName = file.replace('.snapshot', '');
      const filePath = path.join(qdDir, file);
      const snapshot = fs.readFileSync(filePath);

      // Upload snapshot to restore
      await fetch(`${this.qdrantUrl}/collections/${collectionName}/snapshots/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: snapshot,
      });
    }
  }

  // ─── Checkpoints Restore ───

  async restoreCheckpoints(backupPath: string): Promise<void> {
    const srcDir = path.join(backupPath, 'checkpoints');
    const destDir = process.env.CHECKPOINT_DIR || './checkpoints';

    if (!fs.existsSync(srcDir)) return;
    fs.mkdirSync(destDir, { recursive: true });
    await execAsync(`cp -r "${srcDir}"/* "${destDir}/"`);
  }

  // ─── List Backups ───

  listBackups(): BackupMetadata[] {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    return fs.readdirSync(BACKUP_DIR)
      .filter(d => fs.existsSync(path.join(BACKUP_DIR, d, 'metadata.json')))
      .map(d => JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, d, 'metadata.json'), 'utf-8')))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ─── Delete Backup ───

  deleteBackup(backupId: string): void {
    const backupPath = path.join(BACKUP_DIR, backupId);
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    fs.rmSync(backupPath, { recursive: true, force: true });
  }
}

// ─── Routes ───

const router = Router();
const backupService = new BackupService();

// List all backups
router.get('/', (req: Request, res: Response) => {
  try {
    const backups = backupService.listBackups();
    res.json({ backups, total: backups.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create full system backup
router.post('/', async (req: Request, res: Response) => {
  try {
    const { notes, components } = req.body;
    const metadata = await backupService.backupAll(notes);
    res.status(201).json(metadata);
  } catch (err: any) {
    res.status(500).json({ error: `Backup failed: ${err.message}` });
  }
});

// Restore from backup
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const result = await backupService.restoreAll(req.params.id);
    res.json({
      message: 'Restore completed',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});

// Get backup details
router.get('/:id', (req: Request, res: Response) => {
  try {
    const backups = backupService.listBackups();
    const backup = backups.find(b => b.id === req.params.id);
    if (!backup) return res.status(404).json({ error: 'Backup not found' });
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete backup
router.delete('/:id', (req: Request, res: Response) => {
  try {
    backupService.deleteBackup(req.params.id);
    res.json({ message: 'Backup deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
