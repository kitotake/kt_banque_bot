// ============================================================
// KT Banque - Commande Admin /transfer
// Virement entre deux comptes, staff uniquement
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { transferMoney } from '../../systems/bank/transactionManager';
import { logTransfer } from '../../systems/logger/logger';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { validateAndParseAmount, validateReason } from '../../utils/validators';
import { formatMoney } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('🔄 [ADMIN] Virement bancaire entre deux utilisateurs')
    .addUserOption(opt =>
      opt.setName('source').setDescription('Compte à débiter').setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('destination').setDescription('Compte à créditer').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('montant').setDescription('Montant en euros').setRequired(true).setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('motif').setDescription('Motif obligatoire du virement').setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const fromUser = interaction.options.getUser('source', true);
    const toUser = interaction.options.getUser('destination', true);
    const amount = interaction.options.getInteger('montant', true);
    const reason = interaction.options.getString('motif', true);

    if (fromUser.id === toUser.id) {
      await interaction.reply({ embeds: [errorEmbed('Erreur', 'Source et destination doivent être différents.')], ephemeral: true });
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
    const reasonCheck = validateReason(reason);
    if (reasonCheck) {
      await interaction.reply({ embeds: [errorEmbed('Motif invalide', reasonCheck)], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await transferMoney(
        fromUser.id, fromUser.username,
        toUser.id, toUser.username,
        amountCheck.cents, reason, interaction.user.id
      );

      if (!result.success || !result.data) {
        await interaction.editReply({ embeds: [errorEmbed('Virement échoué', result.error ?? 'Erreur interne.')] });
        return;
      }

      const { txOut } = result.data;
      const embed = successEmbed(
        'Virement effectué',
        `**${formatMoney(amountCheck.cents)}** virés de <@${fromUser.id}> vers <@${toUser.id}>.\n\n📋 Motif: ${reason}\n📊 Nouveau solde source: **${formatMoney(txOut.balanceAfter)}**`
      );

      await interaction.editReply({ embeds: [embed] });
      await logTransfer(txOut, fromUser.username, toUser.username, interaction.user.username, reason).catch(console.error);
    } catch (err) {
      console.error('[/transfer]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Virement échoué.')] });
    }
  },
};
