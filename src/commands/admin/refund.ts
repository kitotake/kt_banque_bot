// ============================================================
// KT Banque - Commande Admin /refund
// Rembourser un achat boutique
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { getPurchaseById, markRefunded } from '../../systems/shop/purchaseManager';
import { processRefund } from '../../systems/bank/transactionManager';
import { logRefund } from '../../systems/logger/logger';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { formatMoney, formatDate } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('refund')
    .setDescription('↩️ [ADMIN] Rembourser un achat boutique')
    .addUserOption(opt =>
      opt.setName('utilisateur').setDescription('L\'utilisateur à rembourser').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('achat_id').setDescription('ID de l\'achat (visible dans /history)').setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser('utilisateur', true);
    const purchaseId = interaction.options.getString('achat_id', true).trim();

    await interaction.deferReply({ ephemeral: true });

    try {
      // Récupération de l'achat
      const purchase = await getPurchaseById(purchaseId);

      if (!purchase) {
        await interaction.editReply({ embeds: [errorEmbed('Introuvable', `Aucun achat avec l'ID \`${purchaseId}\`.`)] });
        return;
      }

      if (purchase.userId !== target.id) {
        await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Cet achat n\'appartient pas à cet utilisateur.')] });
        return;
      }

      if (purchase.refunded) {
        await interaction.editReply({
          embeds: [errorEmbed('Déjà remboursé', `Cet achat a déjà été remboursé le ${formatDate(purchase.refundedAt ?? 0)}.`)],
        });
        return;
      }

      // Traitement du remboursement
      const refundResult = await processRefund(
        target.id,
        target.username,
        purchase.price,
        purchase.itemName,
        interaction.user.id,
        purchase.id
      );

      if (!refundResult.success) {
        await interaction.editReply({ embeds: [errorEmbed('Échec', refundResult.error ?? 'Erreur.')] });
        return;
      }

      // Marquer l'achat comme remboursé
      await markRefunded(purchase.id, target.id, interaction.user.id);

      const embed = successEmbed(
        'Remboursement effectué',
        `<@${target.id}> a été remboursé de **+${formatMoney(purchase.price)}** pour l'article **${purchase.itemName}**.\n\n📊 Nouveau solde: **${formatMoney(refundResult.data!.balanceAfter)}**`
      );

      await interaction.editReply({ embeds: [embed] });
      await logRefund(purchase, target.username, interaction.user.username, interaction.user.id).catch(console.error);
    } catch (err) {
      console.error('[/refund]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Remboursement échoué.')] });
    }
  },
};
