// ============================================================
// KT Banque - Sécurité (MariaDB)
// Anti-fraude, cooldowns, permissions staff
// ============================================================

import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { getStaffRoles } from '../database/configManager';

// ─── Anti double-transaction ─────────────────────────────────
const recentTransactions = new Map<string, number>();

export function checkDoubleTransaction(key: string): boolean {
  const now = Date.now();
  const last = recentTransactions.get(key);
  if (last && now - last < 5000) return false;
  recentTransactions.set(key, now);
  for (const [k, ts] of recentTransactions.entries()) {
    if (now - ts > 10_000) recentTransactions.delete(k);
  }
  return true;
}

// ─── Cooldowns ───────────────────────────────────────────────
const cooldownMap = new Map<string, number>();

export function checkCooldown(userId: string, command: string, seconds: number): string | null {
  const key = `${userId}:${command}`;
  const now  = Date.now();
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

// ─── Validation montant ──────────────────────────────────────
export function validateAmount(amount: number, max = 999_999_999): string | null {
  if (!Number.isInteger(amount)) return 'Le montant doit être un entier.';
  if (amount <= 0)               return 'Le montant doit être supérieur à 0.';
  if (amount > max)              return `Le montant dépasse le maximum (${max.toLocaleString('fr-FR')} Prex).`;
  return null;
}

// ─── Permissions Staff ───────────────────────────────────────
export async function isStaff(member: GuildMember): Promise<boolean> {
  if (member.permissions.has('Administrator')) return true;
  const staffRoles = await getStaffRoles();
  return staffRoles.some(roleId => member.roles.cache.has(roleId));
}

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

// ─── Validation ID article ────────────────────────────────────
export function validateItemId(id: string): string | null {
  if (!id || id.length < 3)            return 'L\'ID doit faire au moins 3 caractères.';
  if (id.length > 64)                  return 'L\'ID ne peut pas dépasser 64 caractères.';
  if (!/^[a-z0-9_-]+$/.test(id))      return 'L\'ID : lettres minuscules, chiffres, _ et - uniquement.';
  return null;
}
