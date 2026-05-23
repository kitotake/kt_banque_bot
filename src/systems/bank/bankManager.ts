// ============================================================
// KT Banque - Gestionnaire des comptes (Prex)
// ============================================================

import { BankAccount, AccountsData, OperationResult } from '../../types';
import { readJSON, writeJSON, createBackup } from './saveSystem';
import { cache } from '../cache/cacheManager';

const ACCOUNTS_FILE = 'accounts.json';
const CACHE_KEY = 'accounts_data';
const CACHE_TTL = 30_000;

async function loadAccounts(): Promise<AccountsData> {
  const cached = cache.get<AccountsData>(CACHE_KEY);
  if (cached) return cached;
  const data = await readJSON<AccountsData>(ACCOUNTS_FILE, {});
  cache.set(CACHE_KEY, data, CACHE_TTL);
  return data;
}

async function saveAccounts(data: AccountsData): Promise<void> {
  cache.delete(CACHE_KEY);
  await writeJSON(ACCOUNTS_FILE, data);
}

export async function getOrCreateAccount(userId: string, username: string): Promise<BankAccount> {
  const accounts = await loadAccounts();

  if (!accounts[userId]) {
    const newAccount: BankAccount = {
      id: userId,
      bank: 0,           // 0 Prex par défaut
      createdAt: Date.now(),
      username,
    };
    accounts[userId] = newAccount;
    await saveAccounts(accounts);
    console.log(`[BankManager] Nouveau compte: ${username} (${userId})`);
  } else if (accounts[userId].username !== username) {
    accounts[userId].username = username;
    await saveAccounts(accounts);
  }

  return accounts[userId];
}

export async function getAccount(userId: string): Promise<BankAccount | null> {
  const accounts = await loadAccounts();
  return accounts[userId] ?? null;
}

export async function updateBalance(userId: string, newBalance: number): Promise<OperationResult<BankAccount>> {
  if (newBalance < 0) return { success: false, error: 'Le solde ne peut pas être négatif.' };

  const accounts = await loadAccounts();
  if (!accounts[userId]) return { success: false, error: 'Compte introuvable.' };

  accounts[userId].bank = Math.round(newBalance);
  await saveAccounts(accounts);
  return { success: true, data: accounts[userId] };
}

export async function hasSufficientFunds(userId: string, amount: number): Promise<boolean> {
  const account = await getAccount(userId);
  return !!account && account.bank >= amount;
}

export async function resetAccount(userId: string, username: string): Promise<OperationResult<BankAccount>> {
  const accounts = await loadAccounts();
  if (!accounts[userId]) return { success: false, error: 'Compte introuvable.' };

  await createBackup(ACCOUNTS_FILE);
  accounts[userId].bank = 0;
  await saveAccounts(accounts);
  return { success: true, data: accounts[userId] };
}

export async function getAllAccounts(): Promise<BankAccount[]> {
  const accounts = await loadAccounts();
  return Object.values(accounts);
}

export async function getEconomyStats(): Promise<{
  totalAccounts: number;
  totalMoney: number;
  averageBalance: number;
  richestUser: BankAccount | null;
}> {
  const accounts = await getAllAccounts();
  if (accounts.length === 0) return { totalAccounts: 0, totalMoney: 0, averageBalance: 0, richestUser: null };

  const totalMoney = accounts.reduce((sum, acc) => sum + acc.bank, 0);
  const richestUser = accounts.reduce((max, acc) => (acc.bank > max.bank ? acc : max));

  return {
    totalAccounts: accounts.length,
    totalMoney,
    averageBalance: Math.floor(totalMoney / accounts.length),
    richestUser,
  };
}
