// ============================================================
// KT Banque - Système de sécurité
// Anti-fraude, cooldowns, validation des montants
// ============================================================

import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { readJSON } from '../bank/saveSystem';
import { BotConfig } from '../../types';

// ─── Anti double-transaction ─────────────────────────────────
// Stocke les hashes des transactions récentes (5 secondes)
const recentTransactions = new Map<string, number>();

/**
 * Vérifie et enregistre une transaction pour éviter le double-envoi
 * @returns true si la transaction est unique, false si doublon
 */
export function checkDoubleTransaction(key: string): boolean {
  const now = Date.now();
  const last = recentTransactions.get(key);

  if (last && now - last < 5000) {
    return false; // Doublon détecté
  }

  recentTransactions.set(key, now);

  // Nettoyage des entrées expirées
  for (const [k, ts] of recentTransactions.entries()) {
    if (now - ts > 10_000) recentTransactions.delete(k);
  }

  return true;
}

// ─── Cooldowns ───────────────────────────────────────────────
const cooldownMap = new Map<string, number>();

/**
 * Vérifie et applique un cooldown par commande/utilisateur
 * @param userId ID Discord de l'utilisateur
 * @param command Nom de la commande
 * @param seconds Durée du cooldown en secondes
 * @returns null si ok, sinon message d'erreur avec temps restant
 */
export function checkCooldown(
  userId: string,
  command: string,
  seconds: number
): string | null {
  const key = `${userId}:${command}`;
  const now = Date.now();
  const last = cooldownMap.get(key);

  if (last) {
    const elapsed = (now - last) / 1000;
    if (elapsed < seconds) {
      const remaining = (seconds - elapsed).toFixed(1);
      return `⏳ Cooldown actif. Réessayez dans **${remaining}s**.`;
    }
  }

  cooldownMap.set(key, now);
  return null;
}

// ─── Validation des montants ─────────────────────────────────

/**
 * Valide un montant monétaire
 * @param amount Montant en centimes
 * @param max Montant maximum autorisé
 */
export function validateAmount(amount: number, max: number = 10_000_000_00): string | null {
  if (!Number.isInteger(amount)) {
    return 'Le montant doit être un nombre entier.';
  }
  if (amount <= 0) {
    return 'Le montant doit être supérieur à 0.';
  }
  if (amount > max) {
    return `Le montant dépasse le maximum autorisé (${formatAmount(max)}).`;
  }
  return null;
}

/**
 * Parse et valide une saisie de montant en euros (ex: "150.50" → 15050 centimes)
 */
export function parseAmount(input: number): { valid: boolean; cents: number; error?: string } {
  if (isNaN(input) || input <= 0) {
    return { valid: false, cents: 0, error: 'Montant invalide. Exemple: 1500 pour 1500€' };
  }

  // Arrondi à l'euro entier (pas de centimes)
  const cents = Math.round(input) * 100;

  if (cents <= 0) {
    return { valid: false, cents: 0, error: 'Le montant doit être supérieur à 0€.' };
  }

  if (cents > 999_999_999) {
    return { valid: false, cents: 0, error: 'Montant trop élevé.' };
  }

  return { valid: true, cents };
}

// ─── Permissions Staff ───────────────────────────────────────

/**
 * Vérifie si un membre a les permissions admin/staff
 */
export async function isStaff(member: GuildMember): Promise<boolean> {
  // Administrateur Discord = toujours autorisé
  if (member.permissions.has('Administrator')) return true;

  // Vérification des rôles staff configurés
  const config = await readJSON<BotConfig>('config.json', {
    startingBalance: 0,
    currency: '€',
    currencyName: 'Euro RP',
    bankName: 'KT Banque',
    maxTransactionAmount: 10000000,
    cooldowns: { balance: 3, history: 5, boutique: 3, buy: 10 },
    adminRoles: [],
    staffRoles: [],
  });

  const staffRoles = [...(config.adminRoles ?? []), ...(config.staffRoles ?? [])];
  return staffRoles.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Vérifie les permissions dans une interaction et répond si refusé
 * @returns true si autorisé
 */
export async function requireStaff(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const member = interaction.member as GuildMember | null;
  if (!member) {
    await interaction.reply({
      content: '❌ Cette commande est uniquement disponible sur un serveur Discord.',
      ephemeral: true,
    });
    return false;
  }

  const authorized = await isStaff(member);
  if (!authorized) {
    await interaction.reply({
      content: '🔒 Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.',
      ephemeral: true,
    });
    return false;
  }

  return true;
}

// ─── Validation d'ID boutique ────────────────────────────────

/**
 * Valide un identifiant d'article (slug)
 * Format: lettres minuscules, chiffres, underscores, tirets
 */
export function validateItemId(id: string): string | null {
  if (!id || id.length < 3) return 'L\'ID doit faire au moins 3 caractères.';
  if (id.length > 64) return 'L\'ID ne peut pas dépasser 64 caractères.';
  if (!/^[a-z0-9_-]+$/.test(id)) {
    return 'L\'ID ne peut contenir que des lettres minuscules, chiffres, _ et -.';
  }
  return null;
}

// Utilitaire interne
function formatAmount(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR')}€`;
}
