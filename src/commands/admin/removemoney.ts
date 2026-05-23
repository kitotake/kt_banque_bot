// ============================================================
// KT Banque - Commande Admin /removemoney
// Retirer de l'argent du compte d'un utilisateur
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { removeMoney } from '../../systems/bank/transactionManager';
import { logRemoveMoney } from '../../systems/logger/logger';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { validateAndParseAmount, validateReason } from '../../utils/validators';
import { formatMoney } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('removemoney')
    .setDescription('💸 [ADMIN] Retirer de l\'argent du compte d\'un utilisateur')
    .addUserOption(opt =>
      opt.setName('utilisateur').setDescription('L\'utilisateur concerné').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('montant').setDescription('Montant en euros à retirer').setRequired(true).setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Motif du retrait').setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser('utilisateur', true);
    const amount = interaction.options.getInteger('montant', true);
    const reason = interaction.options.getString('raison', true);

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
      const result = await removeMoney(
        target.id,
        target.username,
        amountCheck.cents,
        reason,
        interaction.user.id
      );

      if (!result.success || !result.data) {
        await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur interne.')] });
        return;
      }

      const embed = successEmbed(
        'Argent retiré',
        `**-${formatMoney(amountCheck.cents)}** ont été retirés du compte de <@${target.id}>.\n\n📊 Nouveau solde: **${formatMoney(result.data.balanceAfter)}**\n📝 Motif: ${reason}`
      );

      await interaction.editReply({ embeds: [embed] });
      await logRemoveMoney(result.data, target.username, interaction.user.username).catch(console.error);
    } catch (err) {
      console.error('[/removemoney]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Opération échouée.')] });
    }
  },
};
