// ============================================================
// KT Banque - /addmoney (admin standalone - redirige vers bankadmin)
// Conservé pour compatibilité avec l'ancienne architecture
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { addMoney } from '../../systems/bank/transactionManager';
import { logAddMoney } from '../../systems/logger/logger';
import { notifyAddMoney } from '../../systems/notifications/notificationManager';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { validateAndParseAmount, validateReason } from '../../utils/validators';
import { formatPrex } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('💰 [ADMIN] Ajouter des Prex au compte d\'un utilisateur')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Joueur bénéficiaire').setRequired(true))
    .addIntegerOption(opt => opt.setName('montant').setDescription('Montant en Prex').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('raison').setDescription('Motif').setRequired(true)) as SlashCommandBuilder,

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
    const reasonErr = validateReason(reason);
    if (reasonErr) {
      await interaction.reply({ embeds: [errorEmbed('Motif invalide', reasonErr)], ephemeral: true });
      return;
    }
    if (target.bot) {
      await interaction.reply({ embeds: [errorEmbed('Erreur', 'Impossible d\'ajouter des fonds à un bot.')], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await addMoney(target.id, target.username, amountCheck.prex, reason, interaction.user.id);

      if (!result.success || !result.data) {
        await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur interne.')] });
        return;
      }

      await interaction.editReply({
        embeds: [successEmbed(
          'Prex ajoutés',
          `**+${formatPrex(amountCheck.prex)}** ajoutés à <@${target.id}>.\n\n💰 Nouveau solde: **${formatPrex(result.data.balanceAfter)}**\n📝 Motif: ${reason}`
        )],
      });

      await notifyAddMoney(target.id, amountCheck.prex, result.data.balanceAfter, reason).catch(() => {});
      await logAddMoney(result.data, target.username, interaction.user.username).catch(console.error);
    } catch (err) {
      console.error('[/addmoney]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Opération échouée.')] });
    }
  },
};
