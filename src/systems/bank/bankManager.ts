// ============================================================
// KT Banque - Gestionnaire des comptes (MariaDB)
// ============================================================

import { query, execute, queryOne } from '../database/db';
import { BankAccount, OperationResult } from '../../types';

interface AccountRow {
  id: string;
  username: string;
  bank: number;
  created_at: number;
}

function rowToAccount(row: AccountRow): BankAccount {
  return {
    id:        row.id,
    username:  row.username,
    bank:      Number(row.bank),
    createdAt: Number(row.created_at),
  };
}

export async function getOrCreateAccount(userId: string, username: string): Promise<BankAccount> {
  await execute(
    `INSERT INTO accounts (id, username, bank, created_at)
     VALUES (?, ?, 0, ?)
     ON DUPLICATE KEY UPDATE username = VALUES(username)`,
    [userId, username, Date.now()]
  );
  const row = await queryOne<AccountRow>(
    'SELECT * FROM accounts WHERE id = ?', [userId]
  );
  return rowToAccount(row!);
}

export async function getAccount(userId: string): Promise<BankAccount | null> {
  const row = await queryOne<AccountRow>(
    'SELECT * FROM accounts WHERE id = ?', [userId]
  );
  return row ? rowToAccount(row) : null;
}

export async function updateBalance(userId: string, newBalance: number): Promise<OperationResult<BankAccount>> {
  if (newBalance < 0) return { success: false, error: 'Le solde ne peut pas être négatif.' };

  await execute(
    'UPDATE accounts SET bank = ? WHERE id = ?',
    [Math.round(newBalance), userId]
  );

  const row = await queryOne<AccountRow>('SELECT * FROM accounts WHERE id = ?', [userId]);
  if (!row) return { success: false, error: 'Compte introuvable.' };
  return { success: true, data: rowToAccount(row) };
}

export async function hasSufficientFunds(userId: string, amount: number): Promise<boolean> {
  const account = await getAccount(userId);
  return !!account && account.bank >= amount;
}

export async function resetAccount(userId: string, username: string): Promise<OperationResult<BankAccount>> {
  const existing = await getAccount(userId);
  if (!existing) return { success: false, error: 'Compte introuvable.' };

  await execute('UPDATE accounts SET bank = 0 WHERE id = ?', [userId]);
  return { success: true, data: { ...existing, bank: 0 } };
}

export async function getAllAccounts(): Promise<BankAccount[]> {
  const rows = await query<AccountRow>('SELECT * FROM accounts');
  return rows.map(rowToAccount);
}

export async function getTopAccounts(limit = 10): Promise<BankAccount[]> {
  const rows = await query<AccountRow>(
    'SELECT * FROM accounts WHERE bank > 0 ORDER BY bank DESC LIMIT ?',
    [limit]
  );
  return rows.map(rowToAccount);
}

export async function getEconomyStats(): Promise<{
  totalAccounts: number;
  totalMoney: number;
  averageBalance: number;
  richestUser: BankAccount | null;
}> {
  const [stats] = await query<{ total: number; total_money: number; avg_balance: number }>(
    'SELECT COUNT(*) as total, SUM(bank) as total_money, AVG(bank) as avg_balance FROM accounts'
  );
  const richest = await queryOne<AccountRow>(
    'SELECT * FROM accounts ORDER BY bank DESC LIMIT 1'
  );

  return {
    totalAccounts:  Number(stats.total),
    totalMoney:     Number(stats.total_money ?? 0),
    averageBalance: Math.floor(Number(stats.avg_balance ?? 0)),
    richestUser:    richest ? rowToAccount(richest) : null,
  };
}
