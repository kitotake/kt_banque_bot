// ============================================================
// KT Banque - Événement guildMemberAdd
// ============================================================

import { Client, GuildMember } from 'discord.js';
import { getOrCreateAccount } from '../systems/bank/bankManager';
import { getOrCreateCard } from '../systems/cards/cardManager';

export function registerGuildMemberAddEvent(client: Client): void {
  client.on('guildMemberAdd', async (member: GuildMember) => {
    if (member.user.bot) return;

    try {
      await getOrCreateAccount(member.user.id, member.user.username);
      await getOrCreateCard(member.user.id, member.user.username);
      console.log(`[GuildMemberAdd] Compte + carte créés pour ${member.user.tag}`);
    } catch (err) {
      console.error(`[GuildMemberAdd] Erreur pour ${member.user.tag}:`, err);
    }
  });
}
