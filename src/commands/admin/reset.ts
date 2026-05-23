// ============================================================
// KT Banque - Commande Admin /reset
// Réinitialiser le compte bancaire d'un utilisateur
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
import { requireStaff } from '../../systems/bank/security';
import { getAccount, resetAccount } from '../../systems/bank/bankManager';
import { logAdminAction } from '../../systems/logger/logger';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds';
import { formatMoney } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('🔄 [ADMIN] Réinitialiser le compte bancaire d\'un utilisateur')
    .addUserOption(opt =>
      opt.setName('utilisateur').setDescription('L\'utilisateur à réinitialiser').setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser('utilisateur', true);

    if (target.bot) {
      await interaction.reply({ embeds: [errorEmbed('Erreur', 'Impossible de reset le compte d\'un bot.')], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const account = await getAccount(target.id);
      const currentBalance = account?.bank ?? 0;

      // Double confirmation obligatoire
      const confirmEmbed = infoEmbed(
        'Confirmation requise',
        `Vous allez **réinitialiser à 0€** le compte de <@${target.id}>.\n\n💰 Solde actuel: **${formatMoney(currentBalance)}**\n\n⚠️ Cette action est **irréversible**. Confirmez-vous ?`
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('reset_confirm').setLabel('✅ Confirmer le reset').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('reset_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary)
      );

      const response = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

      const btn = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 20_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(() => null);

      if (!btn || btn.customId === 'reset_cancel') {
        await interaction.editReply({ embeds: [infoEmbed('Annulé', 'Reset annulé.')], components: [] });
        return;
      }

      await btn.deferUpdate();

      const result = await resetAccount(target.id, target.username);

      if (!result.success) {
        await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur.')], components: [] });
        return;
      }

      await interaction.editReply({
        embeds: [successEmbed('Compte réinitialisé', `Le compte de <@${target.id}> a été remis à **0€**.\n\n💰 Solde précédent: ${formatMoney(currentBalance)}`)],
        components: [],
      });

      await logAdminAction('RESET_ACCOUNT', `Reset du compte de ${target.username} (${formatMoney(currentBalance)} → 0€)`, interaction.user.username, interaction.user.id, { targetId: target.id, previousBalance: currentBalance }).catch(console.error);
    } catch (err) {
      console.error('[/reset]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Reset échoué.')], components: [] });
    }
  },
};
