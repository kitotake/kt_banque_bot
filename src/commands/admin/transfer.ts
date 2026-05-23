// ============================================================
// KT Banque - /transfer (admin) - Prex
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { transferMoney } from '../../systems/bank/transactionManager';
import { logTransfer } from '../../systems/logger/logger';
import { notifyTransferSent, notifyTransferReceived } from '../../systems/notifications/notificationManager';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { validateAndParseAmount, validateReason } from '../../utils/validators';
import { formatPrex } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('🔄 [ADMIN] Virement bancaire entre deux utilisateurs')
    .addUserOption(opt => opt.setName('source').setDescription('Compte à débiter').setRequired(true))
    .addUserOption(opt => opt.setName('destination').setDescription('Compte à créditer').setRequired(true))
    .addIntegerOption(opt => opt.setName('montant').setDescription('Montant en Prex').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('motif').setDescription('Motif du virement').setRequired(true)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const fromUser = interaction.options.getUser('source', true);
    const toUser = interaction.options.getUser('destination', true);
    const amount = interaction.options.getInteger('montant', true);
    const reason = interaction.options.getString('motif', true);

    if (fromUser.id === toUser.id) {
      await interaction.reply({ embeds: [errorEmbed('Erreur', 'Source et destination identiques.')], ephemeral: true });
      return;
    }
    if (fromUser.bot || toUser.bot) {
      await interaction.reply({ embeds: [errorEmbed('Erreur', 'Impossible de transférer vers/depuis un bot.')], ephemeral: true });
      return;
    }

    const amountCheck = validateAndParseAmount(amount);
    if (!amountCheck.ok) {
      await interaction.reply({ embeds: [errorEmbed('Montant invalide', amountCheck.error)], ephemeral: true });
      return;
    }
    const reasonErr = validateReason(reason);
    if (reasonErr) {
      await interaction.reply({ embeds: [errorEmbed('Motif invalide', reasonErr)], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await transferMoney(
        fromUser.id, fromUser.username,
        toUser.id, toUser.username,
        amountCheck.prex, reason, interaction.user.id
      );

      if (!result.success || !result.data) {
        await interaction.editReply({ embeds: [errorEmbed('Virement échoué', result.error ?? 'Erreur interne.')] });
        return;
      }

      const { txOut, txIn } = result.data;

      await interaction.editReply({
        embeds: [successEmbed(
          'Virement effectué',
          `**${formatPrex(amountCheck.prex)}** virés de <@${fromUser.id}> vers <@${toUser.id}>.\n\n📋 Motif: ${reason}\n📊 Solde source: **${formatPrex(txOut.balanceAfter)}**`
        )],
      });

      await notifyTransferSent(fromUser.id, amountCheck.prex, txOut.balanceAfter, toUser.username, reason).catch(() => {});
      await notifyTransferReceived(toUser.id, amountCheck.prex, txIn.balanceAfter, fromUser.username, reason).catch(() => {});
      await logTransfer(txOut, fromUser.username, toUser.username, interaction.user.username, reason).catch(console.error);
    } catch (err) {
      console.error('[/transfer]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Virement échoué.')] });
    }
  },
};
