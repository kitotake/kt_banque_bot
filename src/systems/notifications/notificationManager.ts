// ============================================================
// KT Banque - Notifications DM
// Messages privés automatiques pour les événements bancaires
// ============================================================

import { Client, EmbedBuilder, User } from 'discord.js';
import { formatPrex, formatPrexSigned } from '../../utils/format';

let clientRef: Client | null = null;

export function initNotifications(client: Client): void {
  clientRef = client;
}

/**
 * Envoie un DM à un utilisateur (silencieux si DMs fermés)
 */
async function sendDM(userId: string, embed: EmbedBuilder): Promise<void> {
  if (!clientRef) return;
  try {
    const user = await clientRef.users.fetch(userId).catch(() => null);
    if (!user) return;
    await user.send({ embeds: [embed] });
  } catch {
    // DMs désactivés par l'utilisateur — silencieux
  }
}

function footer() {
  return { text: '🏦 KT Banque • Notification automatique' };
}

// ─── Notifications ───────────────────────────────────────────

/**
 * Notification d'ajout d'argent
 */
export async function notifyAddMoney(
  userId: string,
  amount: number,
  newBalance: number,
  reason: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('💰 Crédit reçu')
    .setDescription(`Votre compte KT Banque a été crédité.`)
    .addFields(
      { name: '💵 Montant reçu', value: formatPrexSigned(amount, true), inline: true },
      { name: '💰 Nouveau solde', value: formatPrex(newBalance), inline: true },
      { name: '📝 Motif', value: reason, inline: false }
    )
    .setFooter(footer())
    .setTimestamp();

  await sendDM(userId, embed);
}

/**
 * Notification de retrait d'argent
 */
export async function notifyRemoveMoney(
  userId: string,
  amount: number,
  newBalance: number,
  reason: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('💸 Débit effectué')
    .setDescription(`Votre compte KT Banque a été débité.`)
    .addFields(
      { name: '💵 Montant retiré', value: formatPrexSigned(amount, false), inline: true },
      { name: '💰 Nouveau solde', value: formatPrex(newBalance), inline: true },
      { name: '📝 Motif', value: reason, inline: false }
    )
    .setFooter(footer())
    .setTimestamp();

  await sendDM(userId, embed);
}

/**
 * Notification de virement reçu
 */
export async function notifyTransferReceived(
  userId: string,
  amount: number,
  newBalance: number,
  fromUsername: string,
  reason: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('📥 Virement reçu')
    .addFields(
      { name: '📤 Expéditeur', value: fromUsername, inline: true },
      { name: '💵 Montant', value: formatPrexSigned(amount, true), inline: true },
      { name: '💰 Nouveau solde', value: formatPrex(newBalance), inline: true },
      { name: '📋 Motif', value: reason, inline: false }
    )
    .setFooter(footer())
    .setTimestamp();

  await sendDM(userId, embed);
}

/**
 * Notification de virement envoyé
 */
export async function notifyTransferSent(
  userId: string,
  amount: number,
  newBalance: number,
  toUsername: string,
  reason: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('📤 Virement envoyé')
    .addFields(
      { name: '📥 Destinataire', value: toUsername, inline: true },
      { name: '💵 Montant', value: formatPrexSigned(amount, false), inline: true },
      { name: '💰 Nouveau solde', value: formatPrex(newBalance), inline: true },
      { name: '📋 Motif', value: reason, inline: false }
    )
    .setFooter(footer())
    .setTimestamp();

  await sendDM(userId, embed);
}

/**
 * Notification d'achat boutique
 */
export async function notifyPurchase(
  userId: string,
  itemName: string,
  price: number,
  newBalance: number
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🛒 Achat effectué')
    .setDescription(`Votre achat a été confirmé. Le staff vous fournira le produit prochainement.`)
    .addFields(
      { name: '🏷️ Produit', value: itemName, inline: true },
      { name: '💵 Prix', value: formatPrexSigned(price, false), inline: true },
      { name: '💰 Nouveau solde', value: formatPrex(newBalance), inline: true }
    )
    .setFooter(footer())
    .setTimestamp();

  await sendDM(userId, embed);
}

/**
 * Notification de remboursement
 */
export async function notifyRefund(
  userId: string,
  itemName: string,
  amount: number,
  newBalance: number
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle('↩️ Remboursement reçu')
    .addFields(
      { name: '🏷️ Article', value: itemName, inline: true },
      { name: '💵 Remboursé', value: formatPrexSigned(amount, true), inline: true },
      { name: '💰 Nouveau solde', value: formatPrex(newBalance), inline: true }
    )
    .setFooter(footer())
    .setTimestamp();

  await sendDM(userId, embed);
}
