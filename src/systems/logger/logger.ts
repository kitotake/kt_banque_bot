// ============================================================
// KT Banque - Système de logs Discord
// Logs enrichis vers salons dédiés + fichier local
// ============================================================

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { readJSON, writeJSON } from '../bank/saveSystem';
import { SystemLog, LogLevel, Transaction, Purchase, ShopItem } from '../../types';

let clientRef: Client | null = null;
const LOGS_FILE = 'logs.json';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Initialise le logger avec le client Discord
 */
export function initLogger(client: Client): void {
  clientRef = client;
}

/**
 * Enregistre un log système dans le fichier local
 */
async function saveLog(log: SystemLog): Promise<void> {
  try {
    const logs = await readJSON<SystemLog[]>(LOGS_FILE, []);
    logs.unshift(log);
    // Garder les 1000 derniers logs
    await writeJSON(LOGS_FILE, logs.slice(0, 1000));
  } catch (err) {
    console.error('[Logger] Impossible de sauvegarder le log:', err);
  }
}

/**
 * Envoie un embed dans un salon Discord de logs
 */
async function sendToChannel(channelId: string, embed: EmbedBuilder): Promise<void> {
  if (!clientRef) return;
  try {
    const channel = await clientRef.channels.fetch(channelId).catch(() => null);
    if (channel instanceof TextChannel) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.warn(`[Logger] Impossible d'envoyer dans le salon ${channelId}:`, err);
  }
}

function getLogChannelId(): string {
  return process.env.LOG_CHANNEL_ID ?? '';
}

function getLog2ChannelId(): string {
  return process.env.LOG2_CHANNEL_ID ?? '';
}

// ─── Logs Économiques (LOG_CHANNEL) ──────────────────────────

/**
 * Log d'ajout d'argent par admin
 */
export async function logAddMoney(
  tx: Transaction,
  targetUsername: string,
  adminUsername: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('💰 Argent ajouté')
    .addFields(
      { name: '👤 Bénéficiaire', value: `${targetUsername} (<@${tx.userId}>)`, inline: true },
      { name: '👮 Staff', value: `${adminUsername} (<@${tx.performedBy}>)`, inline: true },
      { name: '💵 Montant', value: `+${formatAmount(tx.amount)}`, inline: true },
      { name: '📊 Nouveau solde', value: formatAmount(tx.balanceAfter), inline: true },
      { name: '📝 Description', value: tx.description, inline: false }
    )
    .setFooter({ text: `Transaction #${tx.id}` })
    .setTimestamp();

  await sendToChannel(getLogChannelId(), embed);

  const log: SystemLog = {
    id: generateId(),
    level: 'INFO',
    action: 'ADD_MONEY',
    description: `${adminUsername} a ajouté ${formatAmount(tx.amount)} à ${targetUsername}`,
    userId: tx.userId,
    performedBy: tx.performedBy,
    metadata: { amount: tx.amount, balanceBefore: tx.balanceBefore, balanceAfter: tx.balanceAfter },
    timestamp: Date.now(),
  };
  await saveLog(log);
}

/**
 * Log de retrait d'argent par admin
 */
export async function logRemoveMoney(
  tx: Transaction,
  targetUsername: string,
  adminUsername: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('💸 Argent retiré')
    .addFields(
      { name: '👤 Compte débité', value: `${targetUsername} (<@${tx.userId}>)`, inline: true },
      { name: '👮 Staff', value: `${adminUsername} (<@${tx.performedBy}>)`, inline: true },
      { name: '💵 Montant', value: `-${formatAmount(tx.amount)}`, inline: true },
      { name: '📊 Nouveau solde', value: formatAmount(tx.balanceAfter), inline: true },
      { name: '📝 Description', value: tx.description, inline: false }
    )
    .setFooter({ text: `Transaction #${tx.id}` })
    .setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({
    id: generateId(), level: 'INFO', action: 'REMOVE_MONEY',
    description: `${adminUsername} a retiré ${formatAmount(tx.amount)} à ${targetUsername}`,
    userId: tx.userId, performedBy: tx.performedBy,
    metadata: { amount: tx.amount, balanceBefore: tx.balanceBefore, balanceAfter: tx.balanceAfter },
    timestamp: Date.now(),
  });
}

/**
 * Log d'un virement staff
 */
export async function logTransfer(
  txOut: Transaction,
  fromUsername: string,
  toUsername: string,
  adminUsername: string,
  reason: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🔄 Virement bancaire')
    .addFields(
      { name: '📤 Source', value: `${fromUsername} (<@${txOut.userId}>)`, inline: true },
      { name: '📥 Destination', value: `${toUsername} (<@${txOut.relatedUserId}>)`, inline: true },
      { name: '💵 Montant', value: formatAmount(txOut.amount), inline: true },
      { name: '👮 Opéré par', value: `${adminUsername} (<@${txOut.performedBy}>)`, inline: true },
      { name: '📋 Motif', value: reason, inline: false }
    )
    .setFooter({ text: `Transaction #${txOut.id}` })
    .setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({
    id: generateId(), level: 'INFO', action: 'TRANSFER',
    description: `${adminUsername}: virement ${formatAmount(txOut.amount)} de ${fromUsername} vers ${toUsername}`,
    userId: txOut.userId, performedBy: txOut.performedBy,
    metadata: { amount: txOut.amount, fromUserId: txOut.userId, toUserId: txOut.relatedUserId, reason },
    timestamp: Date.now(),
  });
}

/**
 * Log d'un achat boutique
 */
export async function logPurchase(
  purchase: Purchase,
  username: string,
  item: ShopItem
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🛒 Achat boutique')
    .addFields(
      { name: '👤 Acheteur', value: `${username} (<@${purchase.userId}>)`, inline: true },
      { name: '🏷️ Article', value: item.name, inline: true },
      { name: '💵 Prix', value: formatAmount(purchase.price), inline: true },
      { name: '📦 Catégorie', value: item.category, inline: true },
      { name: '🔖 ID Article', value: item.id, inline: true }
    )
    .setFooter({ text: `Achat #${purchase.id}` })
    .setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({
    id: generateId(), level: 'INFO', action: 'PURCHASE',
    description: `${username} a acheté "${item.name}" pour ${formatAmount(purchase.price)}`,
    userId: purchase.userId, performedBy: purchase.userId,
    metadata: { itemId: item.id, price: purchase.price },
    timestamp: Date.now(),
  });
}

/**
 * Log d'un remboursement
 */
export async function logRefund(
  purchase: Purchase,
  targetUsername: string,
  adminUsername: string,
  adminId: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle('↩️ Remboursement')
    .addFields(
      { name: '👤 Bénéficiaire', value: `${targetUsername} (<@${purchase.userId}>)`, inline: true },
      { name: '👮 Staff', value: `${adminUsername} (<@${adminId}>)`, inline: true },
      { name: '🏷️ Article', value: purchase.itemName, inline: true },
      { name: '💵 Montant remboursé', value: `+${formatAmount(purchase.price)}`, inline: true }
    )
    .setFooter({ text: `Achat #${purchase.id}` })
    .setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({
    id: generateId(), level: 'INFO', action: 'REFUND',
    description: `${adminUsername} a remboursé ${formatAmount(purchase.price)} à ${targetUsername} (${purchase.itemName})`,
    userId: purchase.userId, performedBy: adminId,
    metadata: { purchaseId: purchase.id, price: purchase.price },
    timestamp: Date.now(),
  });
}

// ─── Logs Système (LOG2_CHANNEL) ─────────────────────────────

/**
 * Log d'erreur système
 */
export async function logError(error: Error | string, context?: string): Promise<void> {
  const message = error instanceof Error ? error.message : error;
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('⚠️ Erreur système')
    .setDescription(`\`\`\`${message}\`\`\``)
    .addFields(context ? [{ name: '📍 Contexte', value: context, inline: false }] : [])
    .setTimestamp();

  await sendToChannel(getLog2ChannelId(), embed);
  console.error(`[Logger] ERREUR: ${message}${context ? ` | Contexte: ${context}` : ''}`);
  await saveLog({
    id: generateId(), level: 'ERROR', action: 'SYSTEM_ERROR',
    description: message, metadata: { context }, timestamp: Date.now(),
  });
}

/**
 * Log d'action admin générique
 */
export async function logAdminAction(
  action: string,
  description: string,
  adminUsername: string,
  adminId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x95a5a6)
    .setTitle(`🔧 Action Admin: ${action}`)
    .setDescription(description)
    .addFields({ name: '👮 Admin', value: `${adminUsername} (<@${adminId}>)`, inline: true })
    .setTimestamp();

  await sendToChannel(getLog2ChannelId(), embed);
  await saveLog({
    id: generateId(), level: 'INFO', action,
    description, performedBy: adminId, metadata, timestamp: Date.now(),
  });
}

/**
 * Log de tentative de fraude
 */
export async function logFraudAttempt(
  userId: string,
  username: string,
  description: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xff4500)
    .setTitle('🚨 Tentative de fraude détectée')
    .addFields(
      { name: '👤 Utilisateur', value: `${username} (<@${userId}>)`, inline: true },
      { name: '📋 Détails', value: description, inline: false }
    )
    .setTimestamp();

  await sendToChannel(getLog2ChannelId(), embed);
  console.warn(`[Logger] FRAUDE: ${username} (${userId}) - ${description}`);
  await saveLog({
    id: generateId(), level: 'CRITICAL', action: 'FRAUD_ATTEMPT',
    description, userId, timestamp: Date.now(),
  });
}

// ─── Utilitaire ──────────────────────────────────────────────
function formatAmount(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€`;
}
