// ============================================================
// KT Banque - Commande /balance
// Affiche le solde bancaire de l'utilisateur
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { getOrCreateAccount } from '../../systems/bank/bankManager';
import { getUserHistory } from '../../systems/bank/transactionManager';
import { checkCooldown } from '../../systems/bank/security';
import { balanceEmbed, errorEmbed } from '../../utils/embeds';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('💰 Consulter votre solde bancaire KT Banque'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Cooldown : 3 secondes
    const cooldown = checkCooldown(interaction.user.id, 'balance', 3);
    if (cooldown) {
      await interaction.reply({ embeds: [errorEmbed('Cooldown', cooldown)], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const account = await getOrCreateAccount(
        interaction.user.id,
        interaction.user.username
      );

      const { total } = await getUserHistory(interaction.user.id, 1, 1);

      const embed = balanceEmbed({
        username: interaction.user.displayName ?? interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL(),
        balance: account.bank,
        createdAt: account.createdAt,
        transactionCount: total,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[/balance]', err);
      await interaction.editReply({
        embeds: [errorEmbed('Erreur', 'Impossible de récupérer votre solde. Réessayez.')],
      });
    }
  },
};
