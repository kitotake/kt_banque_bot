// ============================================================
// KT Banque - Gestionnaire des transactions
// Création, lecture et gestion de l'historique complet
// ============================================================

import {
  Transaction,
  TransactionsData,
  TransactionType,
  OperationResult,
  BankAccount,
} from '../../types';
import { readJSON, writeJSON } from './saveSystem';
import { updateBalance, getAccount, getOrCreateAccount } from './bankManager';
import { cache } from '../cache/cacheManager';

// Génère un UUID sans dépendance externe
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const TRANSACTIONS_FILE = 'transactions.json';
const CACHE_PREFIX = 'tx_';
const CACHE_TTL = 20_000;

/**
 * Charge les transactions d'un utilisateur
 */
async function loadUserTransactions(userId: string): Promise<Transaction[]> {
  const cacheKey = `${CACHE_PREFIX}${userId}`;
  const cached = cache.get<Transaction[]>(cacheKey);
  if (cached) return cached;

  const all = await readJSON<TransactionsData>(TRANSACTIONS_FILE, {});
  const userTx = all[userId] ?? [];
  cache.set(cacheKey, userTx, CACHE_TTL);
  return userTx;
}

/**
 * Sauvegarde les transactions d'un utilisateur
 */
async function saveUserTransactions(userId: string, transactions: Transaction[]): Promise<void> {
  cache.delete(`${CACHE_PREFIX}${userId}`);
  const all = await readJSON<TransactionsData>(TRANSACTIONS_FILE, {});
  all[userId] = transactions;
  await writeJSON(TRANSACTIONS_FILE, all);
}

/**
 * Enregistre une nouvelle transaction dans l'historique
 */
async function recordTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  const transaction: Transaction = { id: generateId(), ...tx };
  const existing = await loadUserTransactions(tx.userId);
  existing.unshift(transaction); // Plus récent en premier

  // Limite l'historique à 500 entrées par utilisateur pour éviter les fichiers trop lourds
  const trimmed = existing.slice(0, 500);
  await saveUserTransactions(tx.userId, trimmed);

  return transaction;
}

// ─── Opérations bancaires principales ───────────────────────

/**
 * Ajoute de l'argent à un compte
 */
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

  const tx = await recordTransaction({
    userId,
    type: 'ADD',
    amount,
    balanceBefore,
    balanceAfter,
    description,
    performedBy,
    timestamp: Date.now(),
  });

  return { success: true, data: tx };
}

/**
 * Retire de l'argent d'un compte
 */
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
      error: `Solde insuffisant. Solde actuel: ${formatAmount(balanceBefore)} | Demandé: ${formatAmount(amount)}`,
    };
  }

  const balanceAfter = balanceBefore - amount;
  const result = await updateBalance(userId, balanceAfter);
  if (!result.success) return { success: false, error: result.error };

  const tx = await recordTransaction({
    userId,
    type: 'REMOVE',
    amount,
    balanceBefore,
    balanceAfter,
    description,
    performedBy,
    timestamp: Date.now(),
  });

  return { success: true, data: tx };
}

/**
 * Transfert staff entre deux comptes
 * Retire de la source, ajoute à la destination, atomiquement
 */
export async function transferMoney(
  fromUserId: string,
  fromUsername: string,
  toUserId: string,
  toUsername: string,
  amount: number,
  reason: string,
  performedBy: string
): Promise<OperationResult<{ txOut: Transaction; txIn: Transaction }>> {
  if (amount <= 0) return { success: false, error: 'Le montant doit être positif.' };
  if (fromUserId === toUserId) return { success: false, error: 'Source et destination identiques.' };

  const fromAccount = await getOrCreateAccount(fromUserId, fromUsername);
  const toAccount = await getOrCreateAccount(toUserId, toUsername);

  if (fromAccount.bank < amount) {
    return {
      success: false,
      error: `Solde insuffisant sur le compte source. Solde: ${formatAmount(fromAccount.bank)}`,
    };
  }

  // Débit source
  const fromBefore = fromAccount.bank;
  const fromAfter = fromBefore - amount;
  await updateBalance(fromUserId, fromAfter);

  const txOut = await recordTransaction({
    userId: fromUserId,
    type: 'TRANSFER_OUT',
    amount,
    balanceBefore: fromBefore,
    balanceAfter: fromAfter,
    description: `Virement vers ${toUsername} — ${reason}`,
    performedBy,
    relatedUserId: toUserId,
    timestamp: Date.now(),
  });

  // Crédit destination
  const toBefore = toAccount.bank;
  const toAfter = toBefore + amount;
  await updateBalance(toUserId, toAfter);

  const txIn = await recordTransaction({
    userId: toUserId,
    type: 'TRANSFER_IN',
    amount,
    balanceBefore: toBefore,
    balanceAfter: toAfter,
    description: `Virement reçu de ${fromUsername} — ${reason}`,
    performedBy,
    relatedUserId: fromUserId,
    timestamp: Date.now(),
  });

  return { success: true, data: { txOut, txIn } };
}

/**
 * Débite un achat boutique
 */
export async function processPurchase(
  userId: string,
  username: string,
  amount: number,
  itemId: string,
  itemName: string
): Promise<OperationResult<Transaction>> {
  const account = await getOrCreateAccount(userId, username);

  if (account.bank < amount) {
    return {
      success: false,
      error: `Solde insuffisant. Solde: ${formatAmount(account.bank)} | Prix: ${formatAmount(amount)}`,
    };
  }

  const balanceBefore = account.bank;
  const balanceAfter = balanceBefore - amount;

  await updateBalance(userId, balanceAfter);

  const tx = await recordTransaction({
    userId,
    type: 'PURCHASE',
    amount,
    balanceBefore,
    balanceAfter,
    description: `Achat: ${itemName}`,
    performedBy: userId,
    itemId,
    timestamp: Date.now(),
  });

  return { success: true, data: tx };
}

/**
 * Rembourse un achat (re-crédite)
 */
export async function processRefund(
  userId: string,
  username: string,
  amount: number,
  itemName: string,
  performedBy: string,
  originalTxId: string
): Promise<OperationResult<Transaction>> {
  const account = await getOrCreateAccount(userId, username);
  const balanceBefore = account.bank;
  const balanceAfter = balanceBefore + amount;

  await updateBalance(userId, balanceAfter);

  const tx = await recordTransaction({
    userId,
    type: 'REFUND',
    amount,
    balanceBefore,
    balanceAfter,
    description: `Remboursement: ${itemName} (tx: ${originalTxId})`,
    performedBy,
    timestamp: Date.now(),
  });

  return { success: true, data: tx };
}

/**
 * Récupère l'historique paginé d'un utilisateur
 */
export async function getUserHistory(
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ transactions: Transaction[]; total: number; pages: number }> {
  const all = await loadUserTransactions(userId);
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const transactions = all.slice(start, start + pageSize);

  return { transactions, total, pages };
}

/**
 * Formate un montant en euros (interne)
 */
function formatAmount(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€`;
}