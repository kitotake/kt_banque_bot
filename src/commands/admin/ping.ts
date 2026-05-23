// ============================================================
// KT Banque - Commande /ping
// Répond simplement avec Pong
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Vérifie la latence du bot') as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      content: '🏓 Pong!',
      ephemeral: true,
    });
  },
};