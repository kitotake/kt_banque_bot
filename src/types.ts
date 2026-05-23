// ============================================================
// KT Banque - Types & Interfaces TypeScript
// ============================================================

import { SlashCommandBuilder, ChatInputCommandInteraction, Client, Collection } from 'discord.js';

// ─── Compte Bancaire ────────────────────────────────────────
export interface BankAccount {
  id: string;           // Discord User ID
  bank: number;         // Solde bancaire en cents (pour éviter les flottants)
  createdAt: number;    // Timestamp de création
  username: string;     // Username Discord au moment de la création
}

// ─── Transaction ────────────────────────────────────────────
export type TransactionType =
  | 'ADD'           // Ajout d'argent par admin
  | 'REMOVE'        // Retrait d'argent par admin
  | 'TRANSFER_IN'   // Virement reçu
  | 'TRANSFER_OUT'  // Virement envoyé
  | 'PURCHASE'      // Achat boutique
  | 'REFUND'        // Remboursement
  | 'RESET'         // Reset de compte
  | 'ACCOUNT_CREATED'; // Création de compte

export interface Transaction {
  id: string;               // UUID unique
  userId: string;           // Discord User ID concerné
  type: TransactionType;    // Type de transaction
  amount: number;           // Montant en cents
  balanceBefore: number;    // Solde avant transaction
  balanceAfter: number;     // Solde après transaction
  description: string;      // Description lisible
  performedBy: string;      // ID de l'acteur (admin/système)
  relatedUserId?: string;   // Pour les transferts : l'autre partie
  itemId?: string;          // Pour les achats : ID de l'objet
  timestamp: number;        // Timestamp UNIX
}

// ─── Article Boutique ───────────────────────────────────────
export interface ShopItem {
  id: string;               // Identifiant unique (slug)
  name: string;             // Nom affiché
  price: number;            // Prix en cents
  category: string;         // Catégorie
  description: string;      // Description complète
  enabled: boolean;         // Disponible à l'achat
  stock: number;            // -1 = illimité, 0+ = limité
  createdBy: string;        // Discord ID du créateur
  createdAt: number;        // Timestamp de création
  updatedAt?: number;       // Timestamp de dernière modification
  salesCount: number;       // Nombre de ventes
  totalRevenue: number;     // Revenus totaux en cents
}

// ─── Données Boutique ───────────────────────────────────────
export interface ShopData {
  items: ShopItem[];
}

// ─── Achat ──────────────────────────────────────────────────
export interface Purchase {
  id: string;               // UUID unique
  userId: string;           // Acheteur
  itemId: string;           // Article acheté
  itemName: string;         // Nom au moment de l'achat
  price: number;            // Prix payé en cents
  transactionId: string;    // Transaction liée
  timestamp: number;        // Timestamp
  refunded: boolean;        // Remboursé ou non
  refundedBy?: string;      // Admin qui a remboursé
  refundedAt?: number;      // Timestamp remboursement
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
  startingBalance: number;
  currency: string;
  currencyName: string;
  bankName: string;
  maxTransactionAmount: number;
  cooldowns: {
    balance: number;
    history: number;
    boutique: number;
    buy: number;
  };
  adminRoles: string[];
  staffRoles: string[];
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
