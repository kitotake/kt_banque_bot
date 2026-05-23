// ============================================================
// KT Banque - Gestionnaire des transactions (MariaDB)
// Prex stockés en entiers — 1000 Prex = 1 €
// ============================================================

import { execute, queryOne, query } from '../database/db';
import { getPool } from '../database/db';
import { getOrCreateAccount, updateBalance } from './bankManager';
import { adjustCentralReserveDB } from '../database/configManager';
import { Transaction, TransactionType, OperationResult } from '../../types';
import mysql from 'mysql2/promise';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface TxRow {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  performed_by: string;
  related_user_id: string | null;
  item_id: string | null;
  timestamp: number;
}

function rowToTx(row: TxRow): Transaction {
  return {
    id:            row.id,
    userId:        row.user_id,
    type:          row.type as TransactionType,
    amount:        Number(row.amount),
    balanceBefore: Number(row.balance_before),
    balanceAfter:  Number(row.balance_after),
    description:   row.description,
    performedBy:   row.performed_by,
    relatedUserId: row.related_user_id ?? undefined,
    itemId:        row.item_id ?? undefined,
    timestamp:     Number(row.timestamp),
  };
}

async function recordTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  const id = generateId();
  await execute(
    `INSERT INTO transactions
     (id, user_id, type, amount, balance_before, balance_after, description, performed_by, related_user_id, item_id, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tx.userId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter,
     tx.description, tx.performedBy, tx.relatedUserId ?? null, tx.itemId ?? null, tx.timestamp]
  );
  return { id, ...tx };
}

// ─── Opérations ──────────────────────────────────────────────

export async function addMoney(
  userId: string, username: string,
  amount: number, description: string, performedBy: string
): Promise<OperationResult<Transaction>> {
  if (amount <= 0) return { success: false, error: 'Le montant doit être positif.' };

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT bank FROM accounts WHERE id = ? FOR UPDATE', [userId]
    );
    let balanceBefore = 0;
    if (rows.length === 0) {
      await conn.execute(
        'INSERT INTO accounts (id, username, bank, created_at) VALUES (?, ?, 0, ?)',
        [userId, username, Date.now()]
      );
    } else {
      balanceBefore = Number(rows[0].bank);
      await conn.execute('UPDATE accounts SET username = ? WHERE id = ?', [username, userId]);
    }

    const balanceAfter = balanceBefore + amount;
    await conn.execute('UPDATE accounts SET bank = ? WHERE id = ?', [balanceAfter, userId]);

    const id = generateId();
    await conn.execute(
      `INSERT INTO transactions (id, user_id, type, amount, balance_before, balance_after, description, performed_by, related_user_id, item_id, timestamp)
       VALUES (?, ?, 'ADD', ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [id, userId, amount, balanceBefore, balanceAfter, description, performedBy, Date.now()]
    );

    await conn.commit();
    return { success: true, data: { id, userId, type: 'ADD', amount, balanceBefore, balanceAfter, description, performedBy, timestamp: Date.now() } };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function removeMoney(
  userId: string, username: string,
  amount: number, description: string, performedBy: string
): Promise<OperationResult<Transaction>> {
  if (amount <= 0) return { success: false, error: 'Le montant doit être positif.' };

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT bank FROM accounts WHERE id = ? FOR UPDATE', [userId]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return { success: false, error: 'Compte introuvable.' };
    }

    const balanceBefore = Number(rows[0].bank);
    if (balanceBefore < amount) {
      await conn.rollback();
      return {
        success: false,
        error: `Solde insuffisant. Solde: ${balanceBefore.toLocaleString('fr-FR')} Prex | Demandé: ${amount.toLocaleString('fr-FR')} Prex`,
      };
    }

    const balanceAfter = balanceBefore - amount;
    await conn.execute('UPDATE accounts SET bank = ? WHERE id = ?', [balanceAfter, userId]);

    const id = generateId();
    await conn.execute(
      `INSERT INTO transactions (id, user_id, type, amount, balance_before, balance_after, description, performed_by, related_user_id, item_id, timestamp)
       VALUES (?, ?, 'REMOVE', ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [id, userId, amount, balanceBefore, balanceAfter, description, performedBy, Date.now()]
    );

    await conn.commit();
    return { success: true, data: { id, userId, type: 'REMOVE', amount, balanceBefore, balanceAfter, description, performedBy, timestamp: Date.now() } };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function transferMoney(
  fromUserId: string, fromUsername: string,
  toUserId: string, toUsername: string,
  amount: number, reason: string, performedBy: string
): Promise<OperationResult<{ txOut: Transaction; txIn: Transaction }>> {
  if (amount <= 0) return { success: false, error: 'Le montant doit être positif.' };
  if (fromUserId === toUserId) return { success: false, error: 'Source et destination identiques.' };

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    // Lock les deux comptes dans un ordre déterministe pour éviter le deadlock
    const [first, second] = fromUserId < toUserId
      ? [fromUserId, toUserId]
      : [toUserId, fromUserId];

    await conn.execute('SELECT bank FROM accounts WHERE id = ? FOR UPDATE', [first]);
    await conn.execute('SELECT bank FROM accounts WHERE id = ? FOR UPDATE', [second]);

    // S'assurer que les deux comptes existent
    await conn.execute(
      'INSERT IGNORE INTO accounts (id, username, bank, created_at) VALUES (?, ?, 0, ?)',
      [fromUserId, fromUsername, Date.now()]
    );
    await conn.execute(
      'INSERT IGNORE INTO accounts (id, username, bank, created_at) VALUES (?, ?, 0, ?)',
      [toUserId, toUsername, Date.now()]
    );

    const [[fromRow]] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT bank FROM accounts WHERE id = ?', [fromUserId]
    );
    const [[toRow]] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT bank FROM accounts WHERE id = ?', [toUserId]
    );

    const fromBefore = Number(fromRow.bank);
    const toBefore   = Number(toRow.bank);

    if (fromBefore < amount) {
      await conn.rollback();
      return { success: false, error: `Solde insuffisant. Solde: ${fromBefore.toLocaleString('fr-FR')} Prex` };
    }

    const fromAfter = fromBefore - amount;
    const toAfter   = toBefore  + amount;
    const now       = Date.now();

    await conn.execute('UPDATE accounts SET bank = ? WHERE id = ?', [fromAfter, fromUserId]);
    await conn.execute('UPDATE accounts SET bank = ? WHERE id = ?', [toAfter,   toUserId]);

    const idOut = generateId();
    const idIn  = generateId();

    await conn.execute(
      `INSERT INTO transactions (id, user_id, type, amount, balance_before, balance_after, description, performed_by, related_user_id, item_id, timestamp)
       VALUES (?, ?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [idOut, fromUserId, amount, fromBefore, fromAfter, `Virement vers ${toUsername} — ${reason}`, performedBy, toUserId, now]
    );
    await conn.execute(
      `INSERT INTO transactions (id, user_id, type, amount, balance_before, balance_after, description, performed_by, related_user_id, item_id, timestamp)
       VALUES (?, ?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [idIn, toUserId, amount, toBefore, toAfter, `Virement reçu de ${fromUsername} — ${reason}`, performedBy, fromUserId, now]
    );

    await conn.commit();

    const txOut: Transaction = { id: idOut, userId: fromUserId, type: 'TRANSFER_OUT', amount, balanceBefore: fromBefore, balanceAfter: fromAfter, description: `Virement vers ${toUsername} — ${reason}`, performedBy, relatedUserId: toUserId, timestamp: now };
    const txIn:  Transaction = { id: idIn,  userId: toUserId,   type: 'TRANSFER_IN',  amount, balanceBefore: toBefore,   balanceAfter: toAfter,   description: `Virement reçu de ${fromUsername} — ${reason}`, performedBy, relatedUserId: fromUserId, timestamp: now };

    return { success: true, data: { txOut, txIn } };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function processPurchase(
  userId: string, username: string,
  amount: number, itemId: string, itemName: string
): Promise<OperationResult<Transaction>> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT bank FROM accounts WHERE id = ? FOR UPDATE', [userId]
    );
    if (rows.length === 0) { await conn.rollback(); return { success: false, error: 'Compte introuvable.' }; }

    const balanceBefore = Number(rows[0].bank);
    if (balanceBefore < amount) {
      await conn.rollback();
      return { success: false, error: `Solde insuffisant. Solde: ${balanceBefore.toLocaleString('fr-FR')} Prex | Prix: ${amount.toLocaleString('fr-FR')} Prex` };
    }

    const balanceAfter = balanceBefore - amount;
    await conn.execute('UPDATE accounts SET bank = ? WHERE id = ?', [balanceAfter, userId]);

    const id  = generateId();
    const now = Date.now();
    await conn.execute(
      `INSERT INTO transactions (id, user_id, type, amount, balance_before, balance_after, description, performed_by, related_user_id, item_id, timestamp)
       VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [id, userId, amount, balanceBefore, balanceAfter, `Achat: ${itemName}`, userId, itemId, now]
    );

    await conn.commit();

    // Ajuster la réserve centrale hors transaction (best-effort)
    adjustCentralReserveDB(-amount).catch(console.warn);

    return { success: true, data: { id, userId, type: 'PURCHASE', amount, balanceBefore, balanceAfter, description: `Achat: ${itemName}`, performedBy: userId, itemId, timestamp: now } };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function processRefund(
  userId: string, username: string,
  amount: number, itemName: string,
  performedBy: string, originalTxId: string
): Promise<OperationResult<Transaction>> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT bank FROM accounts WHERE id = ? FOR UPDATE', [userId]
    );
    if (rows.length === 0) { await conn.rollback(); return { success: false, error: 'Compte introuvable.' }; }

    const balanceBefore = Number(rows[0].bank);
    const balanceAfter  = balanceBefore + amount;
    const id  = generateId();
    const now = Date.now();

    await conn.execute('UPDATE accounts SET bank = ? WHERE id = ?', [balanceAfter, userId]);
    await conn.execute(
      `INSERT INTO transactions (id, user_id, type, amount, balance_before, balance_after, description, performed_by, related_user_id, item_id, timestamp)
       VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [id, userId, amount, balanceBefore, balanceAfter, `Remboursement: ${itemName} (tx: ${originalTxId})`, performedBy, now]
    );

    await conn.commit();
    adjustCentralReserveDB(amount).catch(console.warn);

    return { success: true, data: { id, userId, type: 'REFUND', amount, balanceBefore, balanceAfter, description: `Remboursement: ${itemName}`, performedBy, timestamp: now } };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getUserHistory(
  userId: string, page = 1, pageSize = 10
): Promise<{ transactions: Transaction[]; total: number; pages: number }> {
  const [[countRow]] = await getPool().execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?', [userId]
  );
  const total  = Number(countRow.total);
  const pages  = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;

  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
    [userId, pageSize, offset]
  );

  return { transactions: (rows as TxRow[]).map(rowToTx), total, pages };
}
