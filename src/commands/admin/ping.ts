import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';

export const command: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('🏓 Vérifie la latence du bot') as SlashCommandBuilder,
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const ws = interaction.client.ws.ping;
    await interaction.reply({ content: `🏓 Pong! Latence: **${ws}ms**`, ephemeral: true });
  },
};
