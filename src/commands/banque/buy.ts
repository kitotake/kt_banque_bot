// ============================================================
// KT Banque - /buy (Prex + notifications DM)
// ============================================================

import {
  ChatInputCommandInteraction, SlashCommandBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
} from 'discord.js';
import { Command } from '../../types';
import { getItemById, recordSale } from '../../systems/shop/shopManager';
import { processPurchase } from '../../systems/bank/transactionManager';
import { recordPurchase } from '../../systems/shop/purchaseManager';
import { getOrCreateAccount } from '../../systems/bank/bankManager';
import { checkCooldown } from '../../systems/bank/security';
import { logPurchase } from '../../systems/logger/logger';
import { notifyPurchase } from '../../systems/notifications/notificationManager';
import { shopItemEmbed, purchaseConfirmEmbed, errorEmbed, infoEmbed } from '../../utils/embeds';
import { formatPrex, formatPrexWithEuro } from '../../utils/format';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('🛒 Acheter un article de la boutique')
    .addStringOption(opt =>
      opt.setName('item_id').setDescription('ID de l\'article (visible dans /boutique)').setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const cooldown = checkCooldown(interaction.user.id, 'buy', 10);
    if (cooldown) {
      await interaction.reply({ embeds: [errorEmbed('Cooldown', cooldown)], ephemeral: true });
      return;
    }

    const itemId = interaction.options.getString('item_id', true).toLowerCase().trim();
    await interaction.deferReply({ ephemeral: true });

    try {
      const item = await getItemById(itemId);

      if (!item) {
        await interaction.editReply({ embeds: [errorEmbed('Introuvable', `Aucun article \`${itemId}\`.\nConsultez \`/boutique\`.`)] });
        return;
      }
      if (!item.enabled) {
        await interaction.editReply({ embeds: [errorEmbed('Indisponible', `**${item.name}** n'est pas disponible.`)] });
        return;
      }
      if (item.stock === 0) {
        await interaction.editReply({ embeds: [errorEmbed('Rupture de stock', `**${item.name}** est en rupture de stock.`)] });
        return;
      }

      const account = await getOrCreateAccount(interaction.user.id, interaction.user.username);

      if (account.bank < item.price) {
        const missing = item.price - account.bank;
        await interaction.editReply({
          embeds: [errorEmbed('Solde insuffisant',
            `💰 Votre solde: **${formatPrex(account.bank)}**\n🏷️ Prix: **${formatPrexWithEuro(item.price)}**\n❌ Manquant: **${formatPrex(missing)}**`
          )],
        });
        return;
      }

      // Confirmation
      const previewEmbed = shopItemEmbed(item);
      previewEmbed.setTitle(`🛒 Confirmer l'achat — ${item.name}`);
      previewEmbed.setDescription(
        `${item.description}\n\n> 💰 Votre solde: **${formatPrex(account.bank)}**\n> 💵 Prix: **${formatPrexWithEuro(item.price)}**\n> 📊 Après achat: **${formatPrex(account.bank - item.price)}**`
      );

      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('buy_confirm').setLabel('✅ Confirmer').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('buy_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Danger)
      );

      const response = await interaction.editReply({ embeds: [previewEmbed], components: [confirmRow] });

      const confirmation = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(() => null);

      if (!confirmation || confirmation.customId === 'buy_cancel') {
        await interaction.editReply({ embeds: [infoEmbed('Annulé', 'Achat annulé.')], components: [] });
        return;
      }

      await confirmation.deferUpdate();

      const txResult = await processPurchase(
        interaction.user.id,
        interaction.user.username,
        item.price,
        item.id,
        item.name
      );

      if (!txResult.success || !txResult.data) {
        await interaction.editReply({ embeds: [errorEmbed('Achat échoué', txResult.error ?? 'Erreur interne.')], components: [] });
        return;
      }

      const purchaseResult = await recordPurchase(
        interaction.user.id, item.id, item.name, item.price, txResult.data.id
      );
      await recordSale(item.id, item.price);

      const newBalance = txResult.data.balanceAfter;
      await interaction.editReply({
        embeds: [purchaseConfirmEmbed({
          username: interaction.user.displayName ?? interaction.user.username,
          itemName: item.name,
          price: item.price,
          newBalance,
        })],
        components: [],
      });

      // Notification DM
      await notifyPurchase(interaction.user.id, item.name, item.price, newBalance).catch(() => {});

      if (purchaseResult.success && purchaseResult.data) {
        await logPurchase(purchaseResult.data, interaction.user.username, item).catch(console.error);
      }
    } catch (err) {
      console.error('[/buy]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Contactez le staff.')], components: [] });
    }
  },
};
