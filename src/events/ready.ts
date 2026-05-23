// ============================================================
// KT Banque - Événement ready
// ============================================================

import { Client, ActivityType } from 'discord.js';
import { backupAll } from '../systems/bank/saveSystem';
import { initLogger } from '../systems/logger/logger';
import { initCentralBank, updateVoiceChannel } from '../systems/economy/centralBank';
import { initNotifications } from '../systems/notifications/notificationManager';

export function registerReadyEvent(client: Client): void {
  client.once('ready', async (c) => {
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║       KT Banque Bot - Online ✅       ║`);
    console.log(`╠══════════════════════════════════════╣`);
    console.log(`║  Connecté: ${c.user.tag.padEnd(26)}║`);
    console.log(`║  Serveurs: ${String(c.guilds.cache.size).padEnd(26)}║`);
    console.log(`║  Monnaie:  Prex (1000 = 1 €)         ║`);
    console.log(`╚══════════════════════════════════════╝\n`);

    // Initialiser les systèmes
    initLogger(client);
    initCentralBank(client);
    initNotifications(client);

    // Statut de présence
    c.user.setPresence({
      activities: [{ name: '🏦 KT Banque RP', type: ActivityType.Watching }],
      status: 'online',
    });

    // Mettre à jour le salon vocal économie
    await updateVoiceChannel().catch(err => console.warn('[Ready] Vocal update échoué:', err));

    // Backup initial
    await backupAll().catch(err => console.warn('[Ready] Backup initial échoué:', err));

    // Backup toutes les heures
    setInterval(async () => {
      await backupAll().catch(err => console.warn('[Ready] Backup périodique échoué:', err));
    }, 60 * 60_000);

    // Mise à jour salon vocal toutes les 10 minutes (au cas où)
    setInterval(async () => {
      await updateVoiceChannel().catch(() => {});
    }, 10 * 60_000);
  });
}
