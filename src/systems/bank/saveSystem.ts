// ============================================================
// KT Banque - Système de sauvegarde JSON robuste
// Queue d'écriture, backups automatiques, anti-corruption
// ============================================================

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// ─── Queue d'écriture pour éviter les race conditions ───────
const writeQueues = new Map<string, Promise<void>>();

/**
 * Lit un fichier JSON de manière sécurisée avec fallback
 */
export async function readJSON<T>(filename: string, defaultValue: T): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    await fs.access(filePath);
    const raw = await fs.readFile(filePath, 'utf-8');

    // Vérification anti-corruption : le fichier ne doit pas être vide
    if (!raw || raw.trim() === '') {
      console.warn(`[SaveSystem] Fichier vide détecté: ${filename}, utilisation valeur par défaut`);
      return defaultValue;
    }

    return JSON.parse(raw) as T;
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      // Fichier inexistant : création avec valeur par défaut
      await writeJSON(filename, defaultValue);
      return defaultValue;
    }
    if (err instanceof SyntaxError) {
      // JSON corrompu : tentative de récupération depuis backup
      console.error(`[SaveSystem] JSON corrompu dans ${filename}, tentative de restauration...`);
      const restored = await restoreFromBackup<T>(filename, defaultValue);
      return restored;
    }
    throw err;
  }
}

/**
 * Écrit un fichier JSON avec queue d'écriture sérialisée
 * pour éviter toute corruption par écriture concurrente
 */
export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);

  // Chaîner les écritures pour ce fichier
  const previousWrite = writeQueues.get(filename) ?? Promise.resolve();
  const currentWrite = previousWrite.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });

      // Écriture atomique : d'abord dans un fichier temporaire
      const tmpPath = filePath + '.tmp';
      const serialized = JSON.stringify(data, null, 2);
      await fs.writeFile(tmpPath, serialized, 'utf-8');

      // Remplacement atomique
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
    // Nettoyer la queue si c'était la dernière écriture
    if (writeQueues.get(filename) === currentWrite) {
      writeQueues.delete(filename);
    }
  }
}

/**
 * Crée un backup automatique d'un fichier
 */
export async function createBackup(filename: string): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${filename.replace('.json', '')}_${timestamp}.json`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.copyFile(filePath, backupPath);

    // Garder uniquement les 10 derniers backups par fichier
    await pruneBackups(filename);
  } catch (err) {
    console.warn(`[SaveSystem] Impossible de créer un backup pour ${filename}:`, err);
  }
}

/**
 * Supprime les anciens backups (garde les 10 derniers)
 */
async function pruneBackups(filename: string): Promise<void> {
  try {
    const baseName = filename.replace('.json', '');
    const files = await fs.readdir(BACKUP_DIR);
    const relevant = files
      .filter(f => f.startsWith(baseName))
      .sort()
      .reverse();

    // Supprimer tout ce qui dépasse les 10 derniers
    for (const old of relevant.slice(10)) {
      await fs.unlink(path.join(BACKUP_DIR, old)).catch(() => {});
    }
  } catch {
    // Silencieux
  }
}

/**
 * Restaure depuis le backup le plus récent
 */
async function restoreFromBackup<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    const baseName = filename.replace('.json', '');
    const files = await fs.readdir(BACKUP_DIR);
    const relevant = files
      .filter(f => f.startsWith(baseName))
      .sort()
      .reverse();

    for (const backupFile of relevant) {
      try {
        const raw = await fs.readFile(path.join(BACKUP_DIR, backupFile), 'utf-8');
        const data = JSON.parse(raw) as T;
        console.log(`[SaveSystem] Restauration depuis ${backupFile}`);
        // Réécrire le fichier restauré
        await writeJSON(filename, data);
        return data;
      } catch {
        continue;
      }
    }
  } catch {
    // Pas de backup disponible
  }

  console.warn(`[SaveSystem] Aucun backup valide pour ${filename}, réinitialisation`);
  await writeJSON(filename, defaultValue);
  return defaultValue;
}

/**
 * Backup automatique de tous les fichiers critiques
 * À appeler périodiquement (ex: toutes les heures)
 */
export async function backupAll(): Promise<void> {
  const criticalFiles = ['accounts.json', 'transactions.json', 'shop.json'];
  await Promise.all(criticalFiles.map(f => createBackup(f)));
  console.log('[SaveSystem] Backup automatique effectué');
}
