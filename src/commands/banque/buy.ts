// ============================================================
// KT Banque - Commande /buy
// Acheter un article de la boutique RP
// ============================================================

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { Command } from '../../types';
import { getItemById, recordSale } from '../../systems/shop/shopManager';
import { processPurchase } from '../../systems/bank/transactionManager';
import { recordPurchase } from '../../systems/shop/purchaseManager';
import { getOrCreateAccount } from '../../systems/bank/bankManager';
import { checkCooldown } from '../../systems/bank/security';
import { logPurchase } from '../../systems/logger/logger';
import { shopItemEmbed, purchaseConfirmEmbed, errorEmbed, infoEmbed } from '../../utils/embeds';
import { formatMoney } from '../../utils/format';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('🛒 Acheter un article de la boutique RP')
    .addStringOption(opt =>
      opt
        .setName('item_id')
        .setDescription('Identifiant de l\'article (visible dans /boutique)')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Cooldown 10 secondes sur les achats
    const cooldown = checkCooldown(interaction.user.id, 'buy', 10);
    if (cooldown) {
      await interaction.reply({ embeds: [errorEmbed('Cooldown', cooldown)], ephemeral: true });
      return;
    }

    const itemId = interaction.options.getString('item_id', true).toLowerCase().trim();

    await interaction.deferReply({ ephemeral: true });

    try {
      // ── 1. Récupération de l'article ──────────────────────
      const item = await getItemById(itemId);

      if (!item) {
        await interaction.editReply({
          embeds: [errorEmbed('Article introuvable', `Aucun article avec l'ID \`${itemId}\`.\nConsultez \`/boutique\` pour voir les articles disponibles.`)],
        });
        return;
      }

      if (!item.enabled) {
        await interaction.editReply({
          embeds: [errorEmbed('Article indisponible', `L'article **${item.name}** n'est pas disponible à l'achat en ce moment.`)],
        });
        return;
      }

      if (item.stock === 0) {
        await interaction.editReply({
          embeds: [errorEmbed('Rupture de stock', `L'article **${item.name}** est en rupture de stock.`)],
        });
        return;
      }

      // ── 2. Vérification du solde ──────────────────────────
      const account = await getOrCreateAccount(interaction.user.id, interaction.user.username);

      if (account.bank < item.price) {
        const missing = item.price - account.bank;
        await interaction.editReply({
          embeds: [errorEmbed(
            'Solde insuffisant',
            `Vous n'avez pas assez de fonds.\n\n💰 Votre solde: **${formatMoney(account.bank)}**\n🏷️ Prix: **${formatMoney(item.price)}**\n❌ Manquant: **${formatMoney(missing)}**`
          )],
        });
        return;
      }

      // ── 3. Confirmation avec aperçu de l'article ──────────
      const previewEmbed = shopItemEmbed(item);
      previewEmbed.setTitle(`🛒 Confirmer l'achat — ${item.name}`);
      previewEmbed.setDescription(
        `${item.description}\n\n> 💰 Votre solde: **${formatMoney(account.bank)}**\n> 💵 Prix: **${formatMoney(item.price)}**\n> 📊 Solde après achat: **${formatMoney(account.bank - item.price)}**`
      );

      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('buy_confirm')
          .setLabel('✅ Confirmer')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('buy_cancel')
          .setLabel('❌ Annuler')
          .setStyle(ButtonStyle.Danger)
      );

      const response = await interaction.editReply({
        embeds: [previewEmbed],
        components: [confirmRow],
      });

      // ── 4. Attente confirmation (30 secondes) ─────────────
      const confirmation = await response
        .awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 30_000,
          filter: i => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!confirmation || confirmation.customId === 'buy_cancel') {
        await interaction.editReply({
          embeds: [infoEmbed('Achat annulé', 'Vous avez annulé l\'achat.')],
          components: [],
        });
        return;
      }

      await confirmation.deferUpdate();

      // ── 5. Traitement de l'achat ──────────────────────────
      const txResult = await processPurchase(
        interaction.user.id,
        interaction.user.username,
        item.price,
        item.id,
        item.name
      );

      if (!txResult.success || !txResult.data) {
        await interaction.editReply({
          embeds: [errorEmbed('Achat échoué', txResult.error ?? 'Erreur interne.')],
          components: [],
        });
        return;
      }

      // ── 6. Enregistrement de l'achat et stats ────────────
      const purchaseResult = await recordPurchase(
        interaction.user.id,
        item.id,
        item.name,
        item.price,
        txResult.data.id
      );

      await recordSale(item.id, item.price);

      // ── 7. Réponse de succès ──────────────────────────────
      const newBalance = txResult.data.balanceAfter;
      const confirmEmbed = purchaseConfirmEmbed({
        username: interaction.user.displayName ?? interaction.user.username,
        itemName: item.name,
        price: item.price,
        newBalance,
      });

      await interaction.editReply({ embeds: [confirmEmbed], components: [] });

      // ── 8. Log Discord ────────────────────────────────────
      if (purchaseResult.success && purchaseResult.data) {
        await logPurchase(purchaseResult.data, interaction.user.username, item).catch(console.error);
      }
    } catch (err) {
      console.error('[/buy]', err);
      await interaction.editReply({
        embeds: [errorEmbed('Erreur critique', 'Une erreur est survenue. Contactez le staff.')],
        components: [],
      });
    }
  },
};
