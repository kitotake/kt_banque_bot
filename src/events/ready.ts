// ============================================================
// KT Banque - Événement ready
// Déclenché quand le bot est connecté et prêt
// ============================================================

import { Client, ActivityType } from 'discord.js';
import { backupAll } from '../systems/bank/saveSystem';
import { initLogger } from '../systems/logger/logger';

export function registerReadyEvent(client: Client): void {
  client.once('ready', async (c) => {
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║       KT Banque Bot - Online ✅       ║`);
    console.log(`╠══════════════════════════════════════╣`);
    console.log(`║  Connecté en tant que: ${c.user.tag.padEnd(14)}║`);
    console.log(`║  Serveurs: ${String(c.guilds.cache.size).padEnd(25)}║`);
    console.log(`╚══════════════════════════════════════╝\n`);

    // Initialiser le logger avec le client
    initLogger(client);

    // Statut de présence
    c.user.setPresence({
      activities: [
        {
          name: '🏦 KT Banque RP',
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });

    // Backup initial au démarrage
    await backupAll().catch(err => console.warn('[Ready] Backup initial échoué:', err));

    // Backup automatique toutes les heures
    setInterval(async () => {
      await backupAll().catch(err => console.warn('[Ready] Backup périodique échoué:', err));
    }, 60 * 60_000);
  });
}
