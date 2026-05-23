// ============================================================
// KT Banque - /history (Prex)
// ============================================================

import {
  ChatInputCommandInteraction, SlashCommandBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
} from 'discord.js';
import { Command } from '../../types';
import { getOrCreateAccount } from '../../systems/bank/bankManager';
import { getUserHistory } from '../../systems/bank/transactionManager';
import { checkCooldown } from '../../systems/bank/security';
import { historyEmbed, errorEmbed } from '../../utils/embeds';
import { transactionEmoji, transactionLabel } from '../../utils/format';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('📋 Consulter votre historique de transactions'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const cooldown = checkCooldown(interaction.user.id, 'history', 5);
    if (cooldown) {
      await interaction.reply({ embeds: [errorEmbed('Cooldown', cooldown)], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await getOrCreateAccount(interaction.user.id, interaction.user.username);

      let page = 1;
      const PAGE_SIZE = 8;

      const buildEmbed = async (p: number) => {
        const { transactions, total, pages } = await getUserHistory(interaction.user.id, p, PAGE_SIZE);

        const mapped = transactions.map(tx => ({
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          timestamp: tx.timestamp,
          emoji: transactionEmoji(tx.type),
          label: transactionLabel(tx.type),
        }));

        return {
          embed: historyEmbed({
            username: interaction.user.displayName ?? interaction.user.username,
            transactions: mapped,
            page: p,
            pages,
            total,
          }),
          pages,
        };
      };

      const buildButtons = (p: number, totalPages: number) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('hist_prev').setLabel('◀ Précédent').setStyle(ButtonStyle.Secondary).setDisabled(p <= 1),
          new ButtonBuilder().setCustomId('hist_next').setLabel('Suivant ▶').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages)
        );

      const { embed, pages } = await buildEmbed(page);
      const response = await interaction.editReply({
        embeds: [embed],
        components: pages > 1 ? [buildButtons(page, pages)] : [],
      });

      if (pages <= 1) return;

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
        filter: i => i.user.id === interaction.user.id,
      });

      collector.on('collect', async i => {
        if (i.customId === 'hist_prev') page = Math.max(1, page - 1);
        if (i.customId === 'hist_next') page = Math.min(pages, page + 1);

        const { embed: newEmbed, pages: newPages } = await buildEmbed(page);
        await i.update({ embeds: [newEmbed], components: [buildButtons(page, newPages)] });
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error('[/history]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Impossible de charger votre historique.')] });
    }
  },
};
