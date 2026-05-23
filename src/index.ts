// ============================================================
// KT Banque - Point d'entrée principal
// ============================================================

import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Command, ExtendedClient } from './types';
import { registerReadyEvent } from './events/ready';
import { registerInteractionEvent } from './events/interactionCreate';
import { registerGuildMemberAddEvent } from './events/guildMemberAdd';

dotenv.config();

const { TOKEN, CLIENT_ID, GUILD_ID, LOG_CHANNEL_ID, LOG2_CHANNEL_ID } = process.env;

if (!TOKEN) { console.error('❌ TOKEN manquant dans .env'); process.exit(1); }
if (!CLIENT_ID) { console.error('❌ CLIENT_ID manquant dans .env'); process.exit(1); }
if (!GUILD_ID) { console.error('❌ GUILD_ID manquant dans .env'); process.exit(1); }
if (!LOG_CHANNEL_ID) console.warn('⚠️  LOG_CHANNEL_ID non défini — logs économiques désactivés.');
if (!LOG2_CHANNEL_ID) console.warn('⚠️  LOG2_CHANNEL_ID non défini — logs admin désactivés.');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
}) as ExtendedClient;

client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, Collection<string, number>>();

function loadCommands(dir: string): void {
  if (!fs.existsSync(dir)) {
    console.warn(`[Loader] Dossier introuvable: ${dir}`);
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
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
        console.warn(`[Loader] ${entry.name}: structure invalide`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`  ✅ /${command.data.name}`);
    } catch (err) {
      console.error(`[Loader] Erreur ${entry.name}:`, err);
    }
  }
}

console.log('\n📦 Chargement des commandes...');
loadCommands(path.join(__dirname, 'commands'));
console.log(`\n✅ ${client.commands.size} commande(s) chargée(s)\n`);

registerReadyEvent(client);
registerInteractionEvent(client, client.commands);
registerGuildMemberAddEvent(client);

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});
process.on('SIGINT', () => { client.destroy(); process.exit(0); });
process.on('SIGTERM', () => { client.destroy(); process.exit(0); });

console.log('🔌 Connexion à Discord...');
client.login(TOKEN).catch(err => {
  console.error('❌ Connexion échouée:', err);
  process.exit(1);
});
