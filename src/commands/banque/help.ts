// ============================================================
// KT Banque - /help
// Menu d'aide interactif avec boutons et catégories
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
import { helpMainEmbed, helpCategoryEmbed } from '../../utils/embeds';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('❓ Afficher l\'aide et les commandes KT Banque'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const buildButtons = (active?: string) => new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('help_bank')
        .setLabel('💳 Banque')
        .setStyle(active === 'bank' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help_card')
        .setLabel('💳 Carte')
        .setStyle(active === 'card' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help_shop')
        .setLabel('🛒 Boutique')
        .setStyle(active === 'shop' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help_admin')
        .setLabel('🔧 Admin')
        .setStyle(active === 'admin' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help_home')
        .setLabel('🏠 Accueil')
        .setStyle(active === 'home' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );

    const response = await interaction.reply({
      embeds: [helpMainEmbed()],
      components: [buildButtons('home')],
      ephemeral: true,
      fetchReply: true,
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      const cat = i.customId.replace('help_', '') as 'bank' | 'card' | 'shop' | 'admin' | 'home';

      if (cat === 'home') {
        await i.update({ embeds: [helpMainEmbed()], components: [buildButtons('home')] });
      } else {
        await i.update({ embeds: [helpCategoryEmbed(cat)], components: [buildButtons(cat)] });
      }
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
