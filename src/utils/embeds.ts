// ============================================================
// KT Banque - Embeds Discord (Prex)
// ============================================================

import { EmbedBuilder } from 'discord.js';
import { formatPrex, formatPrexWithEuro, formatPrexSigned } from '../utils/format';
import { BankCard, ShopItem, RankEntry } from '../types';
import { cardStatusLabel, cardStatusColor } from '../systems/cards/cardManager';

export const Colors = {
  SUCCESS: 0x2ecc71,
  ERROR: 0xe74c3c,
  INFO: 0xf39c12,
  PRIMARY: 0x3498db,
  PURPLE: 0x9b59b6,
  DARK: 0x2c3e50,
  GOLD: 0xf1c40f,
  TEAL: 0x1abc9c,
} as const;

function footer(extra?: string) {
  return { text: extra ? `KT Banque • ${extra}` : 'KT Banque' };
}

// ─── Génériques ──────────────────────────────────────────────

export function successEmbed(title: string, description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(Colors.SUCCESS).setTitle(`✅ ${title}`).setFooter(footer()).setTimestamp();
  if (description) e.setDescription(description);
  return e;
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(Colors.ERROR).setTitle(`❌ ${title}`).setFooter(footer()).setTimestamp();
  if (description) e.setDescription(description);
  return e;
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(Colors.INFO).setTitle(`ℹ️ ${title}`).setFooter(footer()).setTimestamp();
  if (description) e.setDescription(description);
  return e;
}

export function loadingEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(Colors.DARK).setDescription(`⏳ ${message}`).setFooter(footer());
}

// ─── Balance ─────────────────────────────────────────────────

export function balanceEmbed(opts: {
  username: string;
  avatarUrl?: string;
  balance: number;
  createdAt: number;
  transactionCount: number;
}): EmbedBuilder {
  const { username, avatarUrl, balance, createdAt, transactionCount } = opts;

  return new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle('🏦 Compte KT Banque')
    .setThumbnail(avatarUrl ?? null)
    .addFields(
      { name: '👤 Titulaire', value: username, inline: true },
      { name: '💰 Solde', value: `**${formatPrex(balance)}**\n*(${(balance / 1000).toLocaleString('fr-FR', { minimumFractionDigits: balance % 1000 === 0 ? 0 : 2 })} €)*`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: '📅 Compte ouvert', value: `<t:${Math.floor(createdAt / 1000)}:D>`, inline: true },
      { name: '📊 Transactions', value: `${transactionCount}`, inline: true }
    )
    .setFooter(footer('Banque RP'))
    .setTimestamp();
}

// ─── Historique ──────────────────────────────────────────────

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
    .setTitle(`📋 Historique — ${username}`)
    .setFooter(footer(`Page ${page}/${pages} • ${total} transaction${total > 1 ? 's' : ''}`))
    .setTimestamp();

  if (transactions.length === 0) {
    embed.setDescription('*Aucune transaction enregistrée.*');
    return embed;
  }

  const positiveTypes = ['ADD', 'TRANSFER_IN', 'REFUND', 'ACCOUNT_CREATED'];
  const lines = transactions.map(tx => {
    const positive = positiveTypes.includes(tx.type);
    const sign = positive ? '+' : '-';
    const time = `<t:${Math.floor(tx.timestamp / 1000)}:R>`;
    return `${tx.emoji} **${tx.label}** • ${sign}${Math.abs(tx.amount).toLocaleString('fr-FR')} Prex\n┗ ${tx.description} • ${time}`;
  });

  embed.setDescription(lines.join('\n\n'));
  return embed;
}

// ─── Top Banque ──────────────────────────────────────────────

export function topBanqueEmbed(opts: {
  centralReserve: number;
  rankings: RankEntry[];
}): EmbedBuilder {
  const { centralReserve, rankings } = opts;

  const medals = ['🥇', '🥈', '🥉'];

  let desc = `> 🏦 **Banque Centrale**\n> **${formatPrex(centralReserve)}**\n*(${(centralReserve / 1000).toLocaleString('fr-FR')} €)*\n\n`;
  desc += `━━━━━━━━━━━━━━━━━━━━━\n**🏆 Classement des joueurs**\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (rankings.length === 0) {
    desc += '*Aucun compte avec des fonds.*';
  } else {
    rankings.forEach((entry, i) => {
      const medal = medals[i] ?? `**${i + 1}.**`;
      desc += `${medal} <@${entry.userId}> — **${formatPrex(entry.balance)}**\n`;
    });
  }

  return new EmbedBuilder()
    .setColor(Colors.GOLD)
    .setTitle('🏦 KT Banque — Classement')
    .setDescription(desc)
    .setFooter(footer('Économie RP'))
    .setTimestamp();
}

// ─── Carte ───────────────────────────────────────────────────

export function cardEmbed(card: BankCard, balance: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(cardStatusColor(card.status))
    .setTitle('💳 Carte KT Banque')
    .setDescription(
      `\`\`\`\n🏦 KT BANQUE\n\n  ${card.id}\n\n  ${card.username.toUpperCase().padEnd(20)}\`\`\``
    )
    .addFields(
      { name: '💰 Solde', value: formatPrex(balance), inline: true },
      { name: '🔘 Statut', value: cardStatusLabel(card.status), inline: true },
      { name: '📅 Créée le', value: `<t:${Math.floor(card.createdAt / 1000)}:D>`, inline: true },
    )
    .setFooter(footer('Carte Bancaire RP'))
    .setTimestamp();
}

// ─── Boutique ────────────────────────────────────────────────

export function shopItemEmbed(item: ShopItem): EmbedBuilder {
  const stockText = item.stock === -1 ? '♾️ Illimité' : item.stock === 0 ? '❌ Rupture' : `📦 ${item.stock} restant${item.stock > 1 ? 's' : ''}`;

  return new EmbedBuilder()
    .setColor(item.enabled ? Colors.PURPLE : Colors.DARK)
    .setTitle(`🏷️ ${item.name}`)
    .setDescription(item.description)
    .addFields(
      { name: '💵 Prix', value: `**${formatPrexWithEuro(item.price)}**`, inline: true },
      { name: '📂 Catégorie', value: item.category, inline: true },
      { name: '📦 Stock', value: stockText, inline: true },
      { name: '🔖 ID', value: `\`${item.id}\``, inline: true },
      { name: '🔘 Statut', value: item.enabled ? '✅ Disponible' : '❌ Indisponible', inline: true }
    )
    .setFooter(footer('Boutique RP'))
    .setTimestamp();
}

export function shopListEmbed(opts: {
  category: string;
  items: ShopItem[];
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
    const stockLabel = item.stock === -1 ? '♾️' : item.stock === 0 ? '❌' : `📦 ${item.stock}`;
    embed.addFields({
      name: `${item.name} — ${formatPrexWithEuro(item.price)} ${stockLabel}`,
      value: `${item.description}\n\`/buy ${item.id}\``,
      inline: false,
    });
  }

  return embed;
}

export function purchaseConfirmEmbed(opts: {
  username: string;
  itemName: string;
  price: number;
  newBalance: number;
}): EmbedBuilder {
  const { username, itemName, price, newBalance } = opts;

  return new EmbedBuilder()
    .setColor(Colors.SUCCESS)
    .setTitle('✅ Achat confirmé')
    .setDescription('Le staff vous fournira le produit prochainement.')
    .addFields(
      { name: '👤 Acheteur', value: username, inline: true },
      { name: '🏷️ Article', value: itemName, inline: true },
      { name: '💵 Prix payé', value: formatPrexSigned(price, false), inline: true },
      { name: '💰 Nouveau solde', value: formatPrex(newBalance), inline: true }
    )
    .setFooter(footer('Boutique RP'))
    .setTimestamp();
}

export function salesStatsEmbed(opts: {
  totalRevenue: number;
  totalSales: number;
  topItems: Array<{ name: string; salesCount: number; totalRevenue: number }>;
}): EmbedBuilder {
  const { totalRevenue, totalSales, topItems } = opts;

  const embed = new EmbedBuilder()
    .setColor(Colors.GOLD)
    .setTitle('📊 Statistiques des ventes')
    .addFields(
      { name: '💰 Revenus totaux', value: formatPrexWithEuro(totalRevenue), inline: true },
      { name: '🛒 Ventes totales', value: `${totalSales}`, inline: true }
    )
    .setFooter(footer('Admin • Boutique'))
    .setTimestamp();

  if (topItems.length > 0) {
    const topText = topItems.map((item, i) =>
      `${i + 1}. **${item.name}** — ${item.salesCount} vente${item.salesCount > 1 ? 's' : ''} • ${formatPrex(item.totalRevenue)}`
    ).join('\n');
    embed.addFields({ name: '🏆 Top articles', value: topText, inline: false });
  }

  return embed;
}

// ─── Help ────────────────────────────────────────────────────

export function helpMainEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle('🏦 KT Banque — Aide')
    .setDescription(
      `Bienvenue sur **KT Banque**, le système bancaire RP du serveur.\n\n` +
      `La monnaie du serveur est le **Prex** *(1 000 Prex = 1 €)*.\n\n` +
      `Sélectionnez une catégorie ci-dessous pour voir les commandes disponibles.`
    )
    .addFields(
      { name: '💳 Banque', value: 'Solde, historique, classement', inline: true },
      { name: '💳 Carte', value: 'Créer, consulter, geler', inline: true },
      { name: '🛒 Boutique', value: 'Parcourir et acheter', inline: true },
      { name: '🔧 Admin', value: 'Commandes staff uniquement', inline: true },
    )
    .setFooter(footer('Système Bancaire RP'))
    .setTimestamp();
}

export function helpCategoryEmbed(category: 'bank' | 'card' | 'shop' | 'admin'): EmbedBuilder {
  const configs = {
    bank: {
      color: Colors.PRIMARY,
      title: '💳 Commandes Banque',
      fields: [
        { name: '/balance', value: 'Affiche votre solde', inline: false },
        { name: '/history', value: 'Historique paginé de vos transactions', inline: false },
        { name: '/topbanque', value: 'Classement des joueurs + réserve centrale', inline: false },
        { name: '/bank', value: 'Tableau de bord complet', inline: false },
      ],
    },
    card: {
      color: Colors.TEAL,
      title: '💳 Commandes Carte',
      fields: [
        { name: '/card create', value: 'Crée votre carte KT Banque', inline: false },
        { name: '/card info', value: 'Affiche votre carte et votre solde', inline: false },
        { name: '/card freeze', value: 'Gèle ou dégèle votre carte', inline: false },
      ],
    },
    shop: {
      color: Colors.PURPLE,
      title: '🛒 Commandes Boutique',
      fields: [
        { name: '/boutique', value: 'Parcourir la boutique par catégorie', inline: false },
        { name: '/buy <id>', value: 'Acheter un article (avec confirmation)', inline: false },
      ],
    },
    admin: {
      color: Colors.GOLD,
      title: '🔧 Commandes Admin',
      fields: [
        { name: '/bankadmin init <montant>', value: 'Initialiser la banque centrale', inline: false },
        { name: '/bankadmin addmoney', value: 'Ajouter des Prex à un joueur', inline: false },
        { name: '/bankadmin removemoney', value: 'Retirer des Prex à un joueur', inline: false },
        { name: '/bankadmin transfer', value: 'Virement entre deux joueurs', inline: false },
        { name: '/bankadmin logs', value: 'Consulter les derniers logs', inline: false },
        { name: '/bankadmin setvocal', value: 'Définir le salon vocal économie', inline: false },
        { name: '/bankadmin withdraw', value: 'Retirer des Prex de la banque centrale', inline: false },
        { name: '/bankadmin deposit', value: 'Déposer des Prex à la banque centrale', inline: false },
      ],
    },
  };

  const cfg = configs[category];
  return new EmbedBuilder()
    .setColor(cfg.color)
    .setTitle(cfg.title)
    .addFields(cfg.fields)
    .setFooter(footer())
    .setTimestamp();
}
