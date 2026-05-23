// ============================================================
// KT Banque - Gestionnaire des achats (MariaDB)
// ============================================================

import { execute, queryOne, query } from '../database/db';
import { Purchase, PurchasesData, OperationResult } from '../../types';

interface PurchaseRow {
  id:             string;
  user_id:        string;
  item_id:        string;
  item_name:      string;
  price:          number;
  transaction_id: string;
  timestamp:      number;
  refunded:       number;
  refunded_by:    string | null;
  refunded_at:    number | null;
}

function rowToPurchase(row: PurchaseRow): Purchase {
  return {
    id:            row.id,
    userId:        row.user_id,
    itemId:        row.item_id,
    itemName:      row.item_name,
    price:         Number(row.price),
    transactionId: row.transaction_id,
    timestamp:     Number(row.timestamp),
    refunded:      row.refunded === 1,
    refundedBy:    row.refunded_by ?? undefined,
    refundedAt:    row.refunded_at ? Number(row.refunded_at) : undefined,
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const pendingPurchases = new Set<string>();

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
    const id  = generateId();
    const now = Date.now();
    await execute(
      `INSERT INTO purchases (id, user_id, item_id, item_name, price, transaction_id, timestamp, refunded)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, userId, itemId, itemName, price, transactionId, now]
    );
    return { success: true, data: { id, userId, itemId, itemName, price, transactionId, timestamp: now, refunded: false } };
  } finally {
    pendingPurchases.delete(lockKey);
  }
}

export async function getPurchaseById(purchaseId: string): Promise<Purchase | null> {
  const row = await queryOne<PurchaseRow>('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
  return row ? rowToPurchase(row) : null;
}

export async function getUserPurchases(userId: string): Promise<Purchase[]> {
  const rows = await query<PurchaseRow>(
    'SELECT * FROM purchases WHERE user_id = ? ORDER BY timestamp DESC',
    [userId]
  );
  return rows.map(rowToPurchase);
}

export async function markRefunded(
  purchaseId: string, userId: string, refundedBy: string
): Promise<OperationResult<Purchase>> {
  const purchase = await getPurchaseById(purchaseId);
  if (!purchase)           return { success: false, error: 'Achat introuvable.' };
  if (purchase.refunded)   return { success: false, error: 'Déjà remboursé.' };
  if (purchase.userId !== userId) return { success: false, error: 'Achat n\'appartient pas à cet utilisateur.' };

  const now = Date.now();
  await execute(
    'UPDATE purchases SET refunded = 1, refunded_by = ?, refunded_at = ? WHERE id = ?',
    [refundedBy, now, purchaseId]
  );
  return { success: true, data: { ...purchase, refunded: true, refundedBy, refundedAt: now } };
}

export async function getRecentPurchases(limit = 20): Promise<(Purchase & { userId: string })[]> {
  const rows = await query<PurchaseRow>(
    'SELECT * FROM purchases ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
  return rows.map(r => ({ ...rowToPurchase(r), userId: r.user_id }));
}
