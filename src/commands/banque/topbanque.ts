// ============================================================
// KT Banque - /topbanque
// Classement des joueurs + banque centrale
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { getAllAccounts } from '../../systems/bank/bankManager';
import { getCentralReserve } from '../../systems/economy/centralBank';
import { checkCooldown } from '../../systems/bank/security';
import { topBanqueEmbed, errorEmbed } from '../../utils/embeds';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('topbanque')
    .setDescription('🏆 Classement des joueurs et réserve de la banque centrale'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const cooldown = checkCooldown(interaction.user.id, 'topbanque', 5);
    if (cooldown) {
      await interaction.reply({ embeds: [errorEmbed('Cooldown', cooldown)], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const [accounts, centralReserve] = await Promise.all([
        getAllAccounts(),
        getCentralReserve(),
      ]);

      // Trier par solde décroissant, prendre le top 10
      const rankings = accounts
        .filter(acc => acc.bank > 0)
        .sort((a, b) => b.bank - a.bank)
        .slice(0, 10)
        .map((acc, i) => ({
          userId: acc.id,
          username: acc.username,
          balance: acc.bank,
          rank: i + 1,
        }));

      await interaction.editReply({
        embeds: [topBanqueEmbed({ centralReserve, rankings })],
      });
    } catch (err) {
      console.error('[/topbanque]', err);
      await interaction.editReply({
        embeds: [errorEmbed('Erreur', 'Impossible de charger le classement.')],
      });
    }
  },
};
