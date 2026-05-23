// ============================================================
// KT Banque - Logger (MariaDB)
// ============================================================

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { execute } from '../database/db';
import { SystemLog, Transaction, Purchase, ShopItem } from '../../types';
import { formatPrex } from '../../utils/format';

let clientRef: Client | null = null;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function initLogger(client: Client): void {
  clientRef = client;
}

async function saveLog(log: Omit<SystemLog, 'id'> & { id?: string }): Promise<void> {
  const id = log.id ?? generateId();
  try {
    await execute(
      `INSERT INTO logs (id, level, action, description, user_id, performed_by, metadata, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, log.level, log.action, log.description,
       log.userId ?? null, log.performedBy ?? null,
       log.metadata ? JSON.stringify(log.metadata) : null,
       log.timestamp]
    );
  } catch (err) {
    console.error('[Logger] Sauvegarde log échouée:', err);
  }
}

async function sendToChannel(channelId: string, embed: EmbedBuilder): Promise<void> {
  if (!clientRef || !channelId) return;
  try {
    const channel = await clientRef.channels.fetch(channelId).catch(() => null);
    if (channel instanceof TextChannel) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.warn(`[Logger] Envoi salon ${channelId} échoué:`, err);
  }
}

const getLogChannelId  = () => process.env.LOG_CHANNEL_ID  ?? '';
const getLog2ChannelId = () => process.env.LOG2_CHANNEL_ID ?? '';

// ─── Logs économiques ────────────────────────────────────────

export async function logAddMoney(tx: Transaction, targetUsername: string, adminUsername: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71).setTitle('💰 Crédit admin')
    .addFields(
      { name: '👤 Bénéficiaire', value: `${targetUsername} (<@${tx.userId}>)`,    inline: true },
      { name: '👮 Staff',        value: `${adminUsername} (<@${tx.performedBy}>)`, inline: true },
      { name: '💵 Montant',      value: `+${formatPrex(tx.amount)}`,               inline: true },
      { name: '💰 Nouveau solde',value: formatPrex(tx.balanceAfter),              inline: true },
      { name: '📝 Motif',        value: tx.description,                            inline: false }
    )
    .setFooter({ text: `KT Banque • Tx #${tx.id}` }).setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({ level: 'INFO', action: 'ADD_MONEY', description: `${adminUsername} +${formatPrex(tx.amount)} → ${targetUsername}`, userId: tx.userId, performedBy: tx.performedBy, metadata: { amount: tx.amount }, timestamp: Date.now() });
}

export async function logRemoveMoney(tx: Transaction, targetUsername: string, adminUsername: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c).setTitle('💸 Débit admin')
    .addFields(
      { name: '👤 Compte débité', value: `${targetUsername} (<@${tx.userId}>)`,    inline: true },
      { name: '👮 Staff',         value: `${adminUsername} (<@${tx.performedBy}>)`, inline: true },
      { name: '💵 Montant',       value: `-${formatPrex(tx.amount)}`,               inline: true },
      { name: '💰 Nouveau solde', value: formatPrex(tx.balanceAfter),              inline: true },
      { name: '📝 Motif',         value: tx.description,                            inline: false }
    )
    .setFooter({ text: `KT Banque • Tx #${tx.id}` }).setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({ level: 'INFO', action: 'REMOVE_MONEY', description: `${adminUsername} -${formatPrex(tx.amount)} ← ${targetUsername}`, userId: tx.userId, performedBy: tx.performedBy, metadata: { amount: tx.amount }, timestamp: Date.now() });
}

export async function logTransfer(txOut: Transaction, fromUsername: string, toUsername: string, adminUsername: string, reason: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x3498db).setTitle('🔄 Virement bancaire')
    .addFields(
      { name: '📤 Source',       value: `${fromUsername} (<@${txOut.userId}>)`,         inline: true },
      { name: '📥 Destination',  value: `${toUsername} (<@${txOut.relatedUserId}>)`,    inline: true },
      { name: '💵 Montant',      value: formatPrex(txOut.amount),                       inline: true },
      { name: '👮 Opéré par',    value: `${adminUsername} (<@${txOut.performedBy}>)`,   inline: true },
      { name: '📋 Motif',        value: reason,                                          inline: false }
    )
    .setFooter({ text: `KT Banque • Tx #${txOut.id}` }).setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({ level: 'INFO', action: 'TRANSFER', description: `${adminUsername}: ${formatPrex(txOut.amount)} ${fromUsername} → ${toUsername}`, userId: txOut.userId, performedBy: txOut.performedBy, metadata: { amount: txOut.amount, reason }, timestamp: Date.now() });
}

export async function logPurchase(purchase: Purchase, username: string, item: ShopItem): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6).setTitle('🛒 Achat boutique')
    .addFields(
      { name: '👤 Acheteur', value: `${username} (<@${purchase.userId}>)`, inline: true },
      { name: '🏷️ Article',  value: item.name,                             inline: true },
      { name: '💵 Prix',     value: formatPrex(purchase.price),            inline: true },
    )
    .setFooter({ text: `KT Banque • Achat #${purchase.id}` }).setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({ level: 'INFO', action: 'PURCHASE', description: `${username} acheté "${item.name}" pour ${formatPrex(purchase.price)}`, userId: purchase.userId, performedBy: purchase.userId, metadata: { itemId: item.id, price: purchase.price }, timestamp: Date.now() });
}

export async function logRefund(purchase: Purchase, targetUsername: string, adminUsername: string, adminId: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12).setTitle('↩️ Remboursement')
    .addFields(
      { name: '👤 Bénéficiaire', value: `${targetUsername} (<@${purchase.userId}>)`, inline: true },
      { name: '👮 Staff',        value: `${adminUsername} (<@${adminId}>)`,           inline: true },
      { name: '🏷️ Article',     value: purchase.itemName,                             inline: true },
      { name: '💵 Remboursé',   value: `+${formatPrex(purchase.price)}`,             inline: true }
    )
    .setFooter({ text: `KT Banque • Achat #${purchase.id}` }).setTimestamp();

  await sendToChannel(getLogChannelId(), embed);
  await saveLog({ level: 'INFO', action: 'REFUND', description: `${adminUsername} remboursé ${formatPrex(purchase.price)} à ${targetUsername}`, userId: purchase.userId, performedBy: adminId, metadata: { purchaseId: purchase.id, price: purchase.price }, timestamp: Date.now() });
}

export async function logError(error: Error | string, context?: string): Promise<void> {
  const message = error instanceof Error ? error.message : error;
  const embed = new EmbedBuilder()
    .setColor(0xff0000).setTitle('⚠️ Erreur système')
    .setDescription(`\`\`\`${message}\`\`\``)
    .addFields(context ? [{ name: '📍 Contexte', value: context }] : [])
    .setTimestamp();

  await sendToChannel(getLog2ChannelId(), embed);
  await saveLog({ level: 'ERROR', action: 'SYSTEM_ERROR', description: message, metadata: { context }, timestamp: Date.now() });
}

export async function logAdminAction(action: string, description: string, adminUsername: string, adminId: string, metadata?: Record<string, unknown>): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x95a5a6).setTitle(`🔧 ${action}`)
    .setDescription(description)
    .addFields({ name: '👮 Admin', value: `${adminUsername} (<@${adminId}>)`, inline: true })
    .setTimestamp();

  await sendToChannel(getLog2ChannelId(), embed);
  await saveLog({ level: 'INFO', action, description, performedBy: adminId, metadata, timestamp: Date.now() });
}

export async function logFraudAttempt(userId: string, username: string, description: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xff4500).setTitle('🚨 Fraude détectée')
    .addFields(
      { name: '👤 Utilisateur', value: `${username} (<@${userId}>)`, inline: true },
      { name: '📋 Détails',     value: description,                   inline: false }
    )
    .setTimestamp();

  await sendToChannel(getLog2ChannelId(), embed);
  await saveLog({ level: 'CRITICAL', action: 'FRAUD_ATTEMPT', description, userId, timestamp: Date.now() });
}

// ─── Lecture des logs (pour /bankadmin logs) ─────────────────
export async function getRecentLogs(limit = 10): Promise<SystemLog[]> {
  const { query } = await import('../database/db');
  interface LogRow {
    id: string; level: string; action: string; description: string;
    user_id: string | null; performed_by: string | null;
    metadata: string | null; timestamp: number;
  }
  const rows = await query<LogRow>(
    'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?', [limit]
  );
  return rows.map(r => ({
    id:          r.id,
    level:       r.level as SystemLog['level'],
    action:      r.action,
    description: r.description,
    userId:      r.user_id ?? undefined,
    performedBy: r.performed_by ?? undefined,
    metadata:    r.metadata ? JSON.parse(r.metadata) : undefined,
    timestamp:   Number(r.timestamp),
  }));
}
