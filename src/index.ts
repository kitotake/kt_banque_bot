// ============================================================
// KT Banque - Point d'entrée principal du bot
// ============================================================

import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Command, ExtendedClient } from './types';
import { registerReadyEvent } from './events/ready';
import { registerInteractionEvent } from './events/interactionCreate';
import { registerGuildMemberAddEvent } from './events/guildMemberAdd';

// Charger les variables d'environnement
dotenv.config();

// ─── Validation de la configuration ─────────────────────────
const { TOKEN, CLIENT_ID, GUILD_ID, LOG_CHANNEL_ID, LOG2_CHANNEL_ID } = process.env;

if (!TOKEN) { console.error('❌ TOKEN manquant dans .env'); process.exit(1); }
if (!CLIENT_ID) { console.error('❌ CLIENT_ID manquant dans .env'); process.exit(1); }
if (!GUILD_ID) { console.error('❌ GUILD_ID manquant dans .env'); process.exit(1); }
if (!LOG_CHANNEL_ID) console.warn('⚠️  LOG_CHANNEL_ID non défini — les logs économiques seront désactivés.');
if (!LOG2_CHANNEL_ID) console.warn('⚠️  LOG2_CHANNEL_ID non défini — les logs admin seront désactivés.');

// ─── Création du client Discord ──────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
}) as ExtendedClient;

client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, Collection<string, number>>();

// ─── Chargement des commandes ────────────────────────────────
function loadCommands(dir: string): void {
  if (!fs.existsSync(dir)) {
    console.warn(`[Loader] Dossier commandes introuvable: ${dir}`);
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      loadCommands(fullPath);
      continue;
    }

    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.js')) continue;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(fullPath);
      const command: Command = mod.command ?? mod.default;

      if (!command?.data || !command?.execute) {
        console.warn(`[Loader] ${entry.name}: structure invalide (data/execute manquant)`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`  ✅ /${command.data.name}`);
    } catch (err) {
      console.error(`[Loader] Erreur chargement ${entry.name}:`, err);
    }
  }
}

const commandsDir = path.join(__dirname, 'commands');
console.log('\n📦 Chargement des commandes...');
loadCommands(commandsDir);
console.log(`\n✅ ${client.commands.size} commande(s) chargée(s)\n`);

// ─── Enregistrement des événements ───────────────────────────
registerReadyEvent(client);
registerInteractionEvent(client, client.commands);
registerGuildMemberAddEvent(client);

// ─── Gestion des erreurs globales ────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection:', promise, 'Reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  // Ne pas crash sur les erreurs non fatales
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Process] Arrêt propre du bot (SIGINT)...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Process] Arrêt propre du bot (SIGTERM)...');
  client.destroy();
  process.exit(0);
});

// ─── Connexion au bot ────────────────────────────────────────
console.log('🔌 Connexion à Discord...');
client.login(TOKEN).catch(err => {
  console.error('❌ Impossible de se connecter à Discord:', err);
  process.exit(1);
});
