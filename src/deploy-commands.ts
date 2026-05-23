// ============================================================
// KT Banque - Déploiement des commandes slash
// npm run deploy
// ============================================================

import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ TOKEN, CLIENT_ID et GUILD_ID requis dans .env');
  process.exit(1);
}

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

function loadCommandsFromDir(dir: string): void {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
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
          console.log(`  ✅ /${command.data.name}`);
        }
      } catch (err) {
        console.error(`  ❌ ${entry.name}:`, err);
      }
    }
  }
}

console.log('\n📦 Chargement des commandes...');
loadCommandsFromDir(path.join(__dirname, 'commands'));

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`\n🚀 Déploiement de ${commands.length} commande(s)...`);
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    ) as unknown[];
    console.log(`\n✅ ${data.length} commande(s) déployée(s) !\n`);
  } catch (err) {
    console.error('\n❌ Déploiement échoué:', err);
    process.exit(1);
  }
})();
