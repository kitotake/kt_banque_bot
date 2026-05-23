import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { errorEmbed } from './embeds';

export function requireGuild(interaction: ChatInputCommandInteraction): GuildMember | null {
  return interaction.member as GuildMember | null;
}

export function isDiscordAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

export function hasAnyRole(member: GuildMember, roleIds: string[]): boolean {
  return roleIds.some(id => member.roles.cache.has(id));
}

export async function denyPermission(
  interaction: ChatInputCommandInteraction,
  message = 'Vous n\'avez pas les permissions nécessaires.'
): Promise<false> {
  await interaction.reply({ embeds: [errorEmbed('Accès refusé', message)], ephemeral: true });
  return false;
}
