// ============================================================
// KT Banque - Types & Interfaces TypeScript
// Monnaie : Prex (1000 Prex = 1 €)
// ============================================================

import { SlashCommandBuilder, ChatInputCommandInteraction, Client, Collection } from 'discord.js';

// ─── Compte Bancaire ────────────────────────────────────────
export interface BankAccount {
  id: string;           // Discord User ID
  bank: number;         // Solde en Prex (entier)
  createdAt: number;    // Timestamp de création
  username: string;     // Username Discord
}

// ─── Transaction ────────────────────────────────────────────
export type TransactionType =
  | 'ADD'
  | 'REMOVE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'PURCHASE'
  | 'REFUND'
  | 'RESET'
  | 'ACCOUNT_CREATED';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;           // En Prex
  balanceBefore: number;    // En Prex
  balanceAfter: number;     // En Prex
  description: string;
  performedBy: string;
  relatedUserId?: string;
  itemId?: string;
  timestamp: number;
}

// ─── Banque Centrale ────────────────────────────────────────
export interface CentralBank {
  reserve: number;          // Réserve en Prex
  lastUpdated: number;
  voiceChannelId?: string;  // Salon vocal économie
}

// ─── Carte Bancaire RP ──────────────────────────────────────
export type CardStatus = 'ACTIVE' | 'FROZEN' | 'CANCELLED';

export interface BankCard {
  id: string;             // Ex: "4837-1938"
  userId: string;
  username: string;
  status: CardStatus;
  createdAt: number;
  frozenAt?: number;
}

// ─── Article Boutique ───────────────────────────────────────
export interface ShopItem {
  id: string;
  name: string;
  price: number;            // En Prex
  category: string;
  description: string;
  enabled: boolean;
  stock: number;            // -1 = illimité
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
  salesCount: number;
  totalRevenue: number;     // En Prex
}

export interface ShopData {
  items: ShopItem[];
}

// ─── Achat ──────────────────────────────────────────────────
export interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  price: number;            // En Prex
  transactionId: string;
  timestamp: number;
  refunded: boolean;
  refundedBy?: string;
  refundedAt?: number;
}

// ─── Log Système ────────────────────────────────────────────
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface SystemLog {
  id: string;
  level: LogLevel;
  action: string;
  description: string;
  userId?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

// ─── Configuration ──────────────────────────────────────────
export interface BotConfig {
  startingBalance: number;    // En Prex
  currency: string;           // "Prex"
  currencyName: string;       // "Prex"
  bankName: string;           // "KT Banque"
  prexPerEuro: number;        // 1000
  maxTransactionAmount: number; // En Prex
  cooldowns: {
    balance: number;
    history: number;
    boutique: number;
    buy: number;
    topbanque: number;
    card: number;
  };
  adminRoles: string[];
  staffRoles: string[];
  voiceChannelId?: string;    // Salon vocal économie
  centralBankReserve: number; // En Prex
}

// ─── Stockage Global ────────────────────────────────────────
export interface AccountsData {
  [userId: string]: BankAccount;
}

export interface TransactionsData {
  [userId: string]: Transaction[];
}

export interface PurchasesData {
  [userId: string]: Purchase[];
}

export interface CardsData {
  [userId: string]: BankCard;
}

// ─── Commande Discord ───────────────────────────────────────
export interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  adminOnly?: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// ─── Client étendu ──────────────────────────────────────────
export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  cooldowns: Collection<string, Collection<string, number>>;
}

// ─── Résultats d'opérations ─────────────────────────────────
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Ranking ────────────────────────────────────────────────
export interface RankEntry {
  userId: string;
  username: string;
  balance: number; // En Prex
  rank: number;
}
