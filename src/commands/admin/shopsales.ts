// ============================================================
// KT Banque - Commande Admin /shopsales
// Statistiques des ventes de la boutique
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { getSalesStats } from '../../systems/shop/shopManager';
import { salesStatsEmbed, errorEmbed } from '../../utils/embeds';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('shopsales')
    .setDescription('📊 [ADMIN] Statistiques des ventes de la boutique'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    await interaction.deferReply({ ephemeral: true });

    try {
      const stats = await getSalesStats();

      await interaction.editReply({
        embeds: [salesStatsEmbed({
          totalRevenue: stats.totalRevenue,
          totalSales: stats.totalSales,
          topItems: stats.topItems.map(i => ({
            name: i.name,
            salesCount: i.salesCount,
            totalRevenue: i.totalRevenue,
          })),
        })],
      });
    } catch (err) {
      console.error('[/shopsales]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Impossible de charger les statistiques.')] });
    }
  },
};
