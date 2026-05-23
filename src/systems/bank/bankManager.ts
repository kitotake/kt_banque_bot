// ============================================================
// KT Banque - Gestionnaire des comptes bancaires
// Création, lecture, mise à jour des comptes
// ============================================================

import { BankAccount, AccountsData, OperationResult } from '../../types';
import { readJSON, writeJSON, createBackup } from './saveSystem';
import { cache } from '../cache/cacheManager';

const ACCOUNTS_FILE = 'accounts.json';
const CACHE_KEY = 'accounts_data';
const CACHE_TTL = 30_000; // 30 secondes

/**
 * Charge tous les comptes (avec cache)
 */
async function loadAccounts(): Promise<AccountsData> {
  const cached = cache.get<AccountsData>(CACHE_KEY);
  if (cached) return cached;

  const data = await readJSON<AccountsData>(ACCOUNTS_FILE, {});
  cache.set(CACHE_KEY, data, CACHE_TTL);
  return data;
}

/**
 * Sauvegarde tous les comptes et invalide le cache
 */
async function saveAccounts(data: AccountsData): Promise<void> {
  cache.delete(CACHE_KEY);
  await writeJSON(ACCOUNTS_FILE, data);
}

/**
 * Récupère ou crée automatiquement un compte bancaire
 */
export async function getOrCreateAccount(
  userId: string,
  username: string
): Promise<BankAccount> {
  const accounts = await loadAccounts();

  if (!accounts[userId]) {
    // Création automatique du compte
    const newAccount: BankAccount = {
      id: userId,
      bank: 0,
      createdAt: Date.now(),
      username,
    };
    accounts[userId] = newAccount;
    await saveAccounts(accounts);
    console.log(`[BankManager] Nouveau compte créé pour ${username} (${userId})`);
  } else {
    // Mise à jour du username si changé
    if (accounts[userId].username !== username) {
      accounts[userId].username = username;
      await saveAccounts(accounts);
    }
  }

  return accounts[userId];
}

/**
 * Récupère un compte existant (null si inexistant)
 */
export async function getAccount(userId: string): Promise<BankAccount | null> {
  const accounts = await loadAccounts();
  return accounts[userId] ?? null;
}

/**
 * Met à jour le solde d'un compte
 * Protection anti-solde négatif incluse
 */
export async function updateBalance(
  userId: string,
  newBalance: number
): Promise<OperationResult<BankAccount>> {
  if (newBalance < 0) {
    return { success: false, error: 'Le solde ne peut pas être négatif.' };
  }

  const accounts = await loadAccounts();
  if (!accounts[userId]) {
    return { success: false, error: 'Compte introuvable.' };
  }

  accounts[userId].bank = newBalance;
  await saveAccounts(accounts);

  return { success: true, data: accounts[userId] };
}

/**
 * Vérifie si un compte a suffisamment de fonds
 */
export async function hasSufficientFunds(
  userId: string,
  amount: number
): Promise<boolean> {
  const account = await getAccount(userId);
  if (!account) return false;
  return account.bank >= amount;
}

/**
 * Remet un compte à zéro
 */
export async function resetAccount(
  userId: string,
  username: string
): Promise<OperationResult<BankAccount>> {
  const accounts = await loadAccounts();

  if (!accounts[userId]) {
    return { success: false, error: 'Compte introuvable.' };
  }

  await createBackup(ACCOUNTS_FILE);

  accounts[userId].bank = 0;
  await saveAccounts(accounts);

  return { success: true, data: accounts[userId] };
}

/**
 * Récupère tous les comptes (pour stats admin)
 */
export async function getAllAccounts(): Promise<BankAccount[]> {
  const accounts = await loadAccounts();
  return Object.values(accounts);
}

/**
 * Statistiques globales de l'économie
 */
export async function getEconomyStats(): Promise<{
  totalAccounts: number;
  totalMoney: number;
  averageBalance: number;
  richestUser: BankAccount | null;
}> {
  const accounts = await getAllAccounts();
  if (accounts.length === 0) {
    return { totalAccounts: 0, totalMoney: 0, averageBalance: 0, richestUser: null };
  }

  const totalMoney = accounts.reduce((sum, acc) => sum + acc.bank, 0);
  const richestUser = accounts.reduce((max, acc) => (acc.bank > max.bank ? acc : max));

  return {
    totalAccounts: accounts.length,
    totalMoney,
    averageBalance: Math.floor(totalMoney / accounts.length),
    richestUser,
  };
}
