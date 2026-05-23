// ============================================================
// KT Banque - Gestionnaire des achats (Prex)
// ============================================================

import { Purchase, PurchasesData, OperationResult } from '../../types';
import { readJSON, writeJSON } from '../bank/saveSystem';
import { cache } from '../cache/cacheManager';

const PURCHASES_FILE = 'purchases.json';
const CACHE_PREFIX = 'purchases_';
const CACHE_TTL = 20_000;
const pendingPurchases = new Set<string>();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function loadAllPurchases(): Promise<PurchasesData> {
  return readJSON<PurchasesData>(PURCHASES_FILE, {});
}

async function loadUserPurchases(userId: string): Promise<Purchase[]> {
  const cacheKey = `${CACHE_PREFIX}${userId}`;
  const cached = cache.get<Purchase[]>(cacheKey);
  if (cached) return cached;
  const all = await loadAllPurchases();
  const purchases = all[userId] ?? [];
  cache.set(cacheKey, purchases, CACHE_TTL);
  return purchases;
}

async function saveUserPurchases(userId: string, purchases: Purchase[]): Promise<void> {
  cache.delete(`${CACHE_PREFIX}${userId}`);
  const all = await loadAllPurchases();
  all[userId] = purchases;
  await writeJSON(PURCHASES_FILE, all);
}

export async function recordPurchase(
  userId: string, itemId: string, itemName: string,
  price: number, transactionId: string
): Promise<OperationResult<Purchase>> {
  const lockKey = `${userId}:${itemId}`;
  if (pendingPurchases.has(lockKey)) {
    return { success: false, error: 'Un achat est déjà en cours pour cet article.' };
  }

  pendingPurchases.add(lockKey);
  try {
    const purchase: Purchase = {
      id: generateId(), userId, itemId, itemName,
      price, transactionId, timestamp: Date.now(), refunded: false,
    };

    const existing = await loadUserPurchases(userId);
    existing.unshift(purchase);
    await saveUserPurchases(userId, existing);
    return { success: true, data: purchase };
  } finally {
    pendingPurchases.delete(lockKey);
  }
}

export async function getPurchaseById(purchaseId: string): Promise<Purchase | null> {
  const all = await loadAllPurchases();
  for (const purchases of Object.values(all)) {
    const found = purchases.find(p => p.id === purchaseId);
    if (found) return found;
  }
  return null;
}

export async function getUserPurchases(userId: string): Promise<Purchase[]> {
  return loadUserPurchases(userId);
}

export async function markRefunded(
  purchaseId: string, userId: string, refundedBy: string
): Promise<OperationResult<Purchase>> {
  const purchases = await loadUserPurchases(userId);
  const idx = purchases.findIndex(p => p.id === purchaseId);
  if (idx === -1) return { success: false, error: 'Achat introuvable.' };
  if (purchases[idx].refunded) return { success: false, error: 'Déjà remboursé.' };

  purchases[idx].refunded = true;
  purchases[idx].refundedBy = refundedBy;
  purchases[idx].refundedAt = Date.now();

  await saveUserPurchases(userId, purchases);
  return { success: true, data: purchases[idx] };
}

export async function getRecentPurchases(limit = 20): Promise<(Purchase & { userId: string })[]> {
  const all = await loadAllPurchases();
  const flat: (Purchase & { userId: string })[] = [];
  for (const [userId, purchases] of Object.entries(all)) {
    for (const p of purchases) flat.push({ ...p, userId });
  }
  return flat.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}
