// ============================================================
// KT Banque - Gestionnaire des transactions (Prex)
// Prex stockés en entiers — 1000 Prex = 1 €
// ============================================================

import {
  Transaction,
  TransactionsData,
  TransactionType,
  OperationResult,
} from '../../types';
import { readJSON, writeJSON } from './saveSystem';
import { updateBalance, getAccount, getOrCreateAccount } from './bankManager';
import { adjustCentralReserve } from '../economy/centralBank';
import { cache } from '../cache/cacheManager';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const TRANSACTIONS_FILE = 'transactions.json';
const CACHE_PREFIX = 'tx_';
const CACHE_TTL = 20_000;

async function loadUserTransactions(userId: string): Promise<Transaction[]> {
  const cacheKey = `${CACHE_PREFIX}${userId}`;
  const cached = cache.get<Transaction[]>(cacheKey);
  if (cached) return cached;

  const all = await readJSON<TransactionsData>(TRANSACTIONS_FILE, {});
  const userTx = all[userId] ?? [];
  cache.set(cacheKey, userTx, CACHE_TTL);
  return userTx;
}

async function saveUserTransactions(userId: string, transactions: Transaction[]): Promise<void> {
  cache.delete(`${CACHE_PREFIX}${userId}`);
  const all = await readJSON<TransactionsData>(TRANSACTIONS_FILE, {});
  all[userId] = transactions;
  await writeJSON(TRANSACTIONS_FILE, all);
}

async function recordTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  const transaction: Transaction = { id: generateId(), ...tx };
  const existing = await loadUserTransactions(tx.userId);
  existing.unshift(transaction);
  await saveUserTransactions(tx.userId, existing.slice(0, 500));
  return transaction;
}

// ─── Opérations ──────────────────────────────────────────────

export async function addMoney(
  userId: string,
  username: string,
  amount: number,
  description: string,
  performedBy: string
): Promise<OperationResult<Transaction>> {
  if (amount <= 0) return { success: false, error: 'Le montant doit être positif.' };

  const account = await getOrCreateAccount(userId, username);
  const balanceBefore = account.bank;
  const balanceAfter = balanceBefore + amount;

  const result = await updateBalance(userId, balanceAfter);
  if (!result.success) return { success: false, error: result.error };

  // La banque centrale ne change pas lors d'un ajout admin
  const tx = await recordTransaction({
    userId, type: 'ADD', amount,
    balanceBefore, balanceAfter,
    description, performedBy, timestamp: Date.now(),
  });

  return { success: true, data: tx };
}

export async function removeMoney(
  userId: string,
  username: string,
  amount: number,
  description: string,
  performedBy: string
): Promise<OperationResult<Transaction>> {
  if (amount <= 0) return { success: false, error: 'Le montant doit être positif.' };

  const account = await getOrCreateAccount(userId, username);
  const balanceBefore = account.bank;

  if (balanceBefore < amount) {
    return {
      success: false,
      error: `Solde insuffisant. Solde: ${balanceBefore.toLocaleString('fr-FR')} Prex | Demandé: ${amount.toLocaleString('fr-FR')} Prex`,
    };
  }

  const balanceAfter = balanceBefore - amount;
  const result = await updateBalance(userId, balanceAfter);
  if (!result.success) return { success: false, error: result.error };

  const tx = await recordTransaction({
    userId, type: 'REMOVE', amount,
    balanceBefore, balanceAfter,
    description, performedBy, timestamp: Date.now(),
  });

  return { success: true, data: tx };
}

export async function transferMoney(
  fromUserId: string, fromUsername: string,
  toUserId: string, toUsername: string,
  amount: number, reason: string, performedBy: string
): Promise<OperationResult<{ txOut: Transaction; txIn: Transaction }>> {
  if (amount <= 0) return { success: false, error: 'Le montant doit être positif.' };
  if (fromUserId === toUserId) return { success: false, error: 'Source et destination identiques.' };

  const fromAccount = await getOrCreateAccount(fromUserId, fromUsername);
  const toAccount = await getOrCreateAccount(toUserId, toUsername);

  if (fromAccount.bank < amount) {
    return {
      success: false,
      error: `Solde insuffisant. Solde: ${fromAccount.bank.toLocaleString('fr-FR')} Prex`,
    };
  }

  const fromBefore = fromAccount.bank;
  const fromAfter = fromBefore - amount;
  await updateBalance(fromUserId, fromAfter);

  const txOut = await recordTransaction({
    userId: fromUserId, type: 'TRANSFER_OUT', amount,
    balanceBefore: fromBefore, balanceAfter: fromAfter,
    description: `Virement vers ${toUsername} — ${reason}`,
    performedBy, relatedUserId: toUserId, timestamp: Date.now(),
  });

  const toBefore = toAccount.bank;
  const toAfter = toBefore + amount;
  await updateBalance(toUserId, toAfter);

  const txIn = await recordTransaction({
    userId: toUserId, type: 'TRANSFER_IN', amount,
    balanceBefore: toBefore, balanceAfter: toAfter,
    description: `Virement reçu de ${fromUsername} — ${reason}`,
    performedBy, relatedUserId: fromUserId, timestamp: Date.now(),
  });

  return { success: true, data: { txOut, txIn } };
}

export async function processPurchase(
  userId: string, username: string,
  amount: number, itemId: string, itemName: string
): Promise<OperationResult<Transaction>> {
  const account = await getOrCreateAccount(userId, username);

  if (account.bank < amount) {
    return {
      success: false,
      error: `Solde insuffisant. Solde: ${account.bank.toLocaleString('fr-FR')} Prex | Prix: ${amount.toLocaleString('fr-FR')} Prex`,
    };
  }

  const balanceBefore = account.bank;
  const balanceAfter = balanceBefore - amount;
  await updateBalance(userId, balanceAfter);

  // Mise à jour banque centrale : retrait boutique réduit la réserve
  await adjustCentralReserve(-amount).catch(console.warn);

  const tx = await recordTransaction({
    userId, type: 'PURCHASE', amount,
    balanceBefore, balanceAfter,
    description: `Achat: ${itemName}`,
    performedBy: userId, itemId, timestamp: Date.now(),
  });

  return { success: true, data: tx };
}

export async function processRefund(
  userId: string, username: string,
  amount: number, itemName: string,
  performedBy: string, originalTxId: string
): Promise<OperationResult<Transaction>> {
  const account = await getOrCreateAccount(userId, username);
  const balanceBefore = account.bank;
  const balanceAfter = balanceBefore + amount;
  await updateBalance(userId, balanceAfter);

  // Remboursement : recrédite la réserve centrale
  await adjustCentralReserve(amount).catch(console.warn);

  const tx = await recordTransaction({
    userId, type: 'REFUND', amount,
    balanceBefore, balanceAfter,
    description: `Remboursement: ${itemName} (tx: ${originalTxId})`,
    performedBy, timestamp: Date.now(),
  });

  return { success: true, data: tx };
}

export async function getUserHistory(
  userId: string,
  page = 1,
  pageSize = 10
): Promise<{ transactions: Transaction[]; total: number; pages: number }> {
  const all = await loadUserTransactions(userId);
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return { transactions: all.slice(start, start + pageSize), total, pages };
}
