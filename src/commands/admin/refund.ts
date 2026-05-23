// ============================================================
// KT Banque - /refund (Prex + notifications DM)
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { getPurchaseById, markRefunded } from '../../systems/shop/purchaseManager';
import { processRefund } from '../../systems/bank/transactionManager';
import { logRefund } from '../../systems/logger/logger';
import { notifyRefund } from '../../systems/notifications/notificationManager';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { formatPrex, formatDate } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('refund')
    .setDescription('↩️ [ADMIN] Rembourser un achat boutique')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur à rembourser').setRequired(true))
    .addStringOption(opt => opt.setName('achat_id').setDescription('ID de l\'achat (visible dans /history)').setRequired(true)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser('utilisateur', true);
    const purchaseId = interaction.options.getString('achat_id', true).trim();

    await interaction.deferReply({ ephemeral: true });

    try {
      const purchase = await getPurchaseById(purchaseId);

      if (!purchase) {
        await interaction.editReply({ embeds: [errorEmbed('Introuvable', `Aucun achat ID \`${purchaseId}\`.`)] });
        return;
      }
      if (purchase.userId !== target.id) {
        await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Cet achat n\'appartient pas à cet utilisateur.')] });
        return;
      }
      if (purchase.refunded) {
        await interaction.editReply({ embeds: [errorEmbed('Déjà remboursé', `Remboursé le ${formatDate(purchase.refundedAt ?? 0)}.`)] });
        return;
      }

      const refundResult = await processRefund(
        target.id, target.username, purchase.price, purchase.itemName,
        interaction.user.id, purchase.id
      );

      if (!refundResult.success) {
        await interaction.editReply({ embeds: [errorEmbed('Échec', refundResult.error ?? 'Erreur.')] });
        return;
      }

      await markRefunded(purchase.id, target.id, interaction.user.id);

      await interaction.editReply({
        embeds: [successEmbed(
          'Remboursement effectué',
          `<@${target.id}> a été remboursé de **+${formatPrex(purchase.price)}** pour **${purchase.itemName}**.\n\n💰 Nouveau solde: **${formatPrex(refundResult.data!.balanceAfter)}**`
        )],
      });

      await notifyRefund(target.id, purchase.itemName, purchase.price, refundResult.data!.balanceAfter).catch(() => {});
      await logRefund(purchase, target.username, interaction.user.username, interaction.user.id).catch(console.error);
    } catch (err) {
      console.error('[/refund]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Remboursement échoué.')] });
    }
  },
};
