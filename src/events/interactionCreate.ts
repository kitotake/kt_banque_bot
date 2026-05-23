// ============================================================
// KT Banque - Événement interactionCreate
// Dispatch des commandes slash vers les handlers
// ============================================================

import { Client, Collection, ChatInputCommandInteraction, Interaction } from 'discord.js';
import { Command } from '../types';
import { logError } from '../systems/logger/logger';
import { errorEmbed } from '../utils/embeds';

export function registerInteractionEvent(client: Client, commands: Collection<string, Command>): void {
  client.on('interactionCreate', async (interaction: Interaction) => {
    // On ne gère que les slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      console.warn(`[Interaction] Commande inconnue: ${interaction.commandName}`);
      await interaction.reply({
        embeds: [errorEmbed('Commande inconnue', 'Cette commande n\'est pas reconnue.')],
        ephemeral: true,
      }).catch(() => {});
      return;
    }

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[Interaction] Erreur dans /${interaction.commandName}:`, error);

      // Log vers Discord
      await logError(error, `Commande: /${interaction.commandName} | User: ${interaction.user.tag}`).catch(() => {});

      // Réponse d'erreur à l'utilisateur
      const errorReply = {
        embeds: [errorEmbed('Erreur inattendue', 'Une erreur interne est survenue. Le staff a été notifié.')],
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
