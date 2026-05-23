// ============================================================
// KT Banque - Déploiement des commandes slash
// Exécuter: npm run deploy
// ============================================================

import { REST, Routes } from 'discord.js';
import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Variables TOKEN, CLIENT_ID et GUILD_ID manquantes dans .env');
  process.exit(1);
}

// ─── Chargement des commandes ────────────────────────────────
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

function loadCommandsFromDir(dir: string): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      loadCommandsFromDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(fullPath);
        const command = mod.command ?? mod.default;
        if (command?.data) {
          commands.push(command.data.toJSON());
          console.log(`  ✅ Chargée: /${command.data.name}`);
        }
      } catch (err) {
        console.error(`  ❌ Erreur chargement ${entry.name}:`, err);
      }
    }
  }
}

const commandsDir = path.join(__dirname, 'commands');
console.log('\n📦 Chargement des commandes...');
loadCommandsFromDir(commandsDir);

// ─── Déploiement via REST ────────────────────────────────────
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`\n🚀 Déploiement de ${commands.length} commande(s) sur le serveur ${GUILD_ID}...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    ) as unknown[];

    console.log(`\n✅ ${data.length} commande(s) déployée(s) avec succès !\n`);
  } catch (err) {
    console.error('\n❌ Échec du déploiement:', err);
    process.exit(1);
  }
})();
