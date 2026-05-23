// ============================================================
// KT Banque - Événement interactionCreate
// ============================================================

import { Client, Collection, ChatInputCommandInteraction, Interaction } from 'discord.js';
import { Command } from '../types';
import { logError } from '../systems/logger/logger';
import { errorEmbed } from '../utils/embeds';

export function registerInteractionEvent(client: Client, commands: Collection<string, Command>): void {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        embeds: [errorEmbed('Commande inconnue', 'Commande non reconnue.')],
        ephemeral: true,
      }).catch(() => {});
      return;
    }

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[Interaction] Erreur /${interaction.commandName}:`, error);

      await logError(error, `/${interaction.commandName} | ${interaction.user.tag}`).catch(() => {});

      const errorReply = {
        embeds: [errorEmbed('Erreur inattendue', 'Erreur interne. Le staff a été notifié.')],
        ephemeral: true,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorReply).catch(() => {});
      } else {
        await interaction.reply(errorReply).catch(() => {});
      }
    }
  });
}
