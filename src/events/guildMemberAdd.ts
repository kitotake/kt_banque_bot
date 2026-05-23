// ============================================================
// KT Banque - Événement guildMemberAdd
// Crée automatiquement un compte bancaire à l'arrivée
// ============================================================

import { Client, GuildMember } from 'discord.js';
import { getOrCreateAccount } from '../systems/bank/bankManager';

export function registerGuildMemberAddEvent(client: Client): void {
  client.on('guildMemberAdd', async (member: GuildMember) => {
    // Ne pas créer de compte pour les bots
    if (member.user.bot) return;

    try {
      await getOrCreateAccount(member.user.id, member.user.username);
      console.log(`[GuildMemberAdd] Compte créé automatiquement pour ${member.user.tag}`);
    } catch (err) {
      console.error(`[GuildMemberAdd] Erreur création compte pour ${member.user.tag}:`, err);
    }
  });
}
