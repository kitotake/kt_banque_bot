// ============================================================
// KT Banque - Builders d'embeds Discord professionnels
// Cohérence visuelle sur toutes les réponses du bot
// ============================================================

import { EmbedBuilder } from 'discord.js';

// ─── Couleurs KT Banque ──────────────────────────────────────
export const Colors = {
  SUCCESS: 0x2ecc71,   // Vert succès
  ERROR: 0xe74c3c,     // Rouge erreur
  INFO: 0xf39c12,      // Jaune information
  PRIMARY: 0x3498db,   // Bleu principal
  PURPLE: 0x9b59b6,    // Violet boutique
  DARK: 0x2c3e50,      // Sombre neutre
  GOLD: 0xf1c40f,      // Or VIP
} as const;

// ─── Footer standard ─────────────────────────────────────────
function footer(extra?: string): { text: string; iconURL?: string } {
  return { text: extra ? `KT Banque • ${extra}` : 'KT Banque' };
}

// ─── Embeds génériques ───────────────────────────────────────

/** Embed de succès vert */
export function successEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setFooter(footer())
    .setTimestamp();
  if (description) embed.setDescription(description);
  return embed;
}

/** Embed d'erreur rouge */
export function errorEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.ERROR)
    .setTitle(`❌ ${title}`)
    .setFooter(footer())
    .setTimestamp();
  if (description) embed.setDescription(description);
  return embed;
}

/** Embed d'information jaune */
export function infoEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.INFO)
    .setTitle(`ℹ️ ${title}`)
    .setFooter(footer())
    .setTimestamp();
  if (description) embed.setDescription(description);
  return embed;
}

/** Embed de chargement / en cours */
export function loadingEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.DARK)
    .setDescription(`⏳ ${message}`)
    .setFooter(footer());
}

// ─── Embeds Bancaires ────────────────────────────────────────

/**
 * Embed de solde utilisateur
 */
export function balanceEmbed(opts: {
  username: string;
  avatarUrl?: string;
  balance: number;
  createdAt: number;
  transactionCount: number;
}): EmbedBuilder {
  const { username, avatarUrl, balance, createdAt, transactionCount } = opts;
  const euros = (balance / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  const createdDate = `<t:${Math.floor(createdAt / 1000)}:D>`;

  return new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle('🏦 Compte KT Banque')
    .setThumbnail(avatarUrl ?? null)
    .addFields(
      {
        name: '👤 Titulaire',
        value: username,
        inline: true,
      },
      {
        name: '💰 Solde bancaire',
        value: `**${euros}€**`,
        inline: true,
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true,
      },
      {
        name: '📅 Compte ouvert le',
        value: createdDate,
        inline: true,
      },
      {
        name: '📊 Transactions',
        value: `${transactionCount} enregistrée${transactionCount > 1 ? 's' : ''}`,
        inline: true,
      }
    )
    .setFooter(footer('Banque RP'))
    .setTimestamp();
}

/**
 * Embed d'historique de transactions
 */
export function historyEmbed(opts: {
  username: string;
  transactions: Array<{
    type: string;
    amount: number;
    description: string;
    timestamp: number;
    emoji: string;
    label: string;
  }>;
  page: number;
  pages: number;
  total: number;
}): EmbedBuilder {
  const { username, transactions, page, pages, total } = opts;

  const embed = new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle(`📋 Historique bancaire — ${username}`)
    .setFooter(footer(`Page ${page}/${pages} • ${total} transaction${total > 1 ? 's' : ''}`))
    .setTimestamp();

  if (transactions.length === 0) {
    embed.setDescription('*Aucune transaction enregistrée.*');
    return embed;
  }

  const lines = transactions.map(tx => {
    const euros = (tx.amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    const sign = ['ADD', 'TRANSFER_IN', 'REFUND', 'ACCOUNT_CREATED'].includes(tx.type) ? '+' : '-';
    const time = `<t:${Math.floor(tx.timestamp / 1000)}:R>`;
    return `${tx.emoji} **${tx.label}** • ${sign}${euros}€\n┗ ${tx.description} • ${time}`;
  });

  embed.setDescription(lines.join('\n\n'));
  return embed;
}

// ─── Embeds Boutique ─────────────────────────────────────────

/**
 * Embed d'un article boutique
 */
export function shopItemEmbed(item: {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  stock: number;
  enabled: boolean;
}): EmbedBuilder {
  const euros = (item.price / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  const stockText = item.stock === -1 ? '♾️ Illimité' : item.stock === 0 ? '❌ Rupture' : `📦 ${item.stock} restant${item.stock > 1 ? 's' : ''}`;

  return new EmbedBuilder()
    .setColor(item.enabled ? Colors.PURPLE : Colors.DARK)
    .setTitle(`🏷️ ${item.name}`)
    .setDescription(item.description)
    .addFields(
      { name: '💵 Prix', value: `**${euros}€**`, inline: true },
      { name: '📂 Catégorie', value: item.category, inline: true },
      { name: '📦 Stock', value: stockText, inline: true },
      { name: '🔖 ID', value: `\`${item.id}\``, inline: true },
      { name: '🔘 Statut', value: item.enabled ? '✅ Disponible' : '❌ Indisponible', inline: true }
    )
    .setFooter(footer('Boutique RP'))
    .setTimestamp();
}

/**
 * Embed de liste boutique (page)
 */
export function shopListEmbed(opts: {
  category: string;
  items: Array<{ id: string; name: string; price: number; description: string; stock: number }>;
  page: number;
  pages: number;
  totalItems: number;
}): EmbedBuilder {
  const { category, items, page, pages, totalItems } = opts;

  const embed = new EmbedBuilder()
    .setColor(Colors.PURPLE)
    .setTitle(`🏪 Boutique KT Banque — ${category}`)
    .setFooter(footer(`Page ${page}/${pages} • ${totalItems} article${totalItems > 1 ? 's' : ''}`))
    .setTimestamp();

  if (items.length === 0) {
    embed.setDescription('*Aucun article disponible dans cette catégorie.*');
    return embed;
  }

  for (const item of items) {
    const euros = (item.price / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    const stockLabel = item.stock === -1 ? '♾️' : item.stock === 0 ? '❌' : `📦 ${item.stock}`;
    embed.addFields({
      name: `${item.name} — ${euros}€ ${stockLabel}`,
      value: `${item.description}\n\`/buy ${item.id}\``,
      inline: false,
    });
  }

  return embed;
}

/**
 * Embed de confirmation d'achat
 */
export function purchaseConfirmEmbed(opts: {
  username: string;
  itemName: string;
  price: number;
  newBalance: number;
}): EmbedBuilder {
  const { username, itemName, price, newBalance } = opts;
  const priceFmt = (price / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  const balanceFmt = (newBalance / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

  return new EmbedBuilder()
    .setColor(Colors.SUCCESS)
    .setTitle('✅ Achat confirmé')
    .addFields(
      { name: '👤 Acheteur', value: username, inline: true },
      { name: '🏷️ Article', value: itemName, inline: true },
      { name: '💵 Prix payé', value: `-${priceFmt}€`, inline: true },
      { name: '💰 Nouveau solde', value: `${balanceFmt}€`, inline: true }
    )
    .setFooter(footer('Boutique RP'))
    .setTimestamp();
}

/**
 * Embed des statistiques de ventes admin
 */
export function salesStatsEmbed(opts: {
  totalRevenue: number;
  totalSales: number;
  topItems: Array<{ name: string; salesCount: number; totalRevenue: number }>;
}): EmbedBuilder {
  const { totalRevenue, totalSales, topItems } = opts;
  const revenueFmt = (totalRevenue / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

  const embed = new EmbedBuilder()
    .setColor(Colors.GOLD)
    .setTitle('📊 Statistiques des ventes')
    .addFields(
      { name: '💰 Revenus totaux', value: `${revenueFmt}€`, inline: true },
      { name: '🛒 Ventes totales', value: `${totalSales}`, inline: true }
    )
    .setFooter(footer('Admin • Boutique'))
    .setTimestamp();

  if (topItems.length > 0) {
    const topText = topItems.map((item, i) => {
      const rev = (item.totalRevenue / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
      return `${i + 1}. **${item.name}** — ${item.salesCount} vente${item.salesCount > 1 ? 's' : ''} • ${rev}€`;
    }).join('\n');

    embed.addFields({ name: '🏆 Top articles', value: topText, inline: false });
  }

  return embed;
}
