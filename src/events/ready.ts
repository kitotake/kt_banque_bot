// ============================================================
// KT Banque - Événement ready (MariaDB)
// ============================================================

import { Client, ActivityType } from 'discord.js';
import { testConnection } from '../systems/database/db';
import { runMigrations } from '../systems/database/migrations';
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

    // ── Base de données ───────────────────────────────────────
    try {
      await testConnection();
      await runMigrations();
    } catch (err) {
      console.error('❌ Connexion MariaDB échouée — arrêt du bot:', err);
      process.exit(1);
    }

    // ── Initialiser les systèmes ──────────────────────────────
    initLogger(client);
    initCentralBank(client);
    initNotifications(client);

    // ── Présence ─────────────────────────────────────────────
    c.user.setPresence({
      activities: [{ name: '🏦 KT Banque RP', type: ActivityType.Watching }],
      status: 'online',
    });

    // ── Salon vocal économie ──────────────────────────────────
    await updateVoiceChannel().catch(err => console.warn('[Ready] Vocal update échoué:', err));

    // Mise à jour salon vocal toutes les 10 minutes (sécurité)
    setInterval(async () => {
      await updateVoiceChannel().catch(() => {});
    }, 10 * 60_000);

    console.log('[Ready] ✅ Bot prêt et base de données connectée.\n');
  });
}
