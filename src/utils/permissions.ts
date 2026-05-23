// ============================================================
// KT Banque - Helpers de permissions
// ============================================================

import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { errorEmbed } from './embeds';

/**
 * Vérifie si l'interaction vient bien d'un serveur
 */
export function requireGuild(interaction: ChatInputCommandInteraction): GuildMember | null {
  return interaction.member as GuildMember | null;
}

/**
 * Vérifie si un membre est administrateur Discord
 */
export function isDiscordAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Vérifie si un membre possède un des rôles listés
 */
export function hasAnyRole(member: GuildMember, roleIds: string[]): boolean {
  return roleIds.some(id => member.roles.cache.has(id));
}

/**
 * Répond avec un embed d'erreur de permissions et retourne false
 */
export async function denyPermission(
  interaction: ChatInputCommandInteraction,
  message: string = 'Vous n\'avez pas les permissions nécessaires.'
): Promise<false> {
  await interaction.reply({
    embeds: [errorEmbed('Accès refusé', message)],
    ephemeral: true,
  });
  return false;
}
