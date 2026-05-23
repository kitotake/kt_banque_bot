// ============================================================
// KT Banque - Système de sauvegarde JSON robuste
// Queue d'écriture atomique, backups automatiques
// ============================================================

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const writeQueues = new Map<string, Promise<void>>();

export async function readJSON<T>(filename: string, defaultValue: T): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    await fs.access(filePath);
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw || raw.trim() === '') {
      console.warn(`[SaveSystem] Fichier vide: ${filename}`);
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      await writeJSON(filename, defaultValue);
      return defaultValue;
    }
    if (err instanceof SyntaxError) {
      console.error(`[SaveSystem] JSON corrompu: ${filename}, restauration...`);
      return restoreFromBackup<T>(filename, defaultValue);
    }
    throw err;
  }
}

export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  const previousWrite = writeQueues.get(filename) ?? Promise.resolve();

  const currentWrite = previousWrite.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmpPath = filePath + '.tmp';
      await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      await fs.rename(tmpPath, filePath);
    } catch (err) {
      console.error(`[SaveSystem] Erreur écriture ${filename}:`, err);
      throw err;
    }
  });

  writeQueues.set(filename, currentWrite);
  try {
    await currentWrite;
  } finally {
    if (writeQueues.get(filename) === currentWrite) {
      writeQueues.delete(filename);
    }
  }
}

export async function createBackup(filename: string): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${filename.replace('.json', '')}_${timestamp}.json`);

  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.copyFile(filePath, backupPath);
    await pruneBackups(filename);
  } catch (err) {
    console.warn(`[SaveSystem] Backup échoué pour ${filename}:`, err);
  }
}

async function pruneBackups(filename: string): Promise<void> {
  try {
    const baseName = filename.replace('.json', '');
    const files = await fs.readdir(BACKUP_DIR);
    const relevant = files.filter(f => f.startsWith(baseName)).sort().reverse();
    for (const old of relevant.slice(10)) {
      await fs.unlink(path.join(BACKUP_DIR, old)).catch(() => {});
    }
  } catch { /* silencieux */ }
}

async function restoreFromBackup<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    const baseName = filename.replace('.json', '');
    const files = await fs.readdir(BACKUP_DIR);
    const relevant = files.filter(f => f.startsWith(baseName)).sort().reverse();

    for (const backupFile of relevant) {
      try {
        const raw = await fs.readFile(path.join(BACKUP_DIR, backupFile), 'utf-8');
        const data = JSON.parse(raw) as T;
        console.log(`[SaveSystem] Restauré depuis ${backupFile}`);
        await writeJSON(filename, data);
        return data;
      } catch { continue; }
    }
  } catch { /* pas de backup */ }

  console.warn(`[SaveSystem] Aucun backup pour ${filename}, réinitialisation`);
  await writeJSON(filename, defaultValue);
  return defaultValue;
}

export async function backupAll(): Promise<void> {
  const criticalFiles = ['accounts.json', 'transactions.json', 'shop.json', 'cards.json', 'config.json'];
  await Promise.all(criticalFiles.map(f => createBackup(f)));
  console.log('[SaveSystem] Backup automatique effectué');
}
