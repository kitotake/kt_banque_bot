// ============================================================
// KT Banque - Banque Centrale
// Réserve globale du serveur en Prex
// ============================================================

import { Client, VoiceChannel, ChannelType } from 'discord.js';
import { BotConfig } from '../../types';
import { readJSON, writeJSON } from '../bank/saveSystem';
import { formatPrex } from '../../utils/format';

const CONFIG_FILE = 'config.json';

let clientRef: Client | null = null;
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

export function initCentralBank(client: Client): void {
  clientRef = client;
}

/**
 * Charge la config (incluant la réserve centrale)
 */
async function loadConfig(): Promise<BotConfig> {
  return readJSON<BotConfig>(CONFIG_FILE, defaultConfig());
}

function defaultConfig(): BotConfig {
  return {
    startingBalance: 0,
    currency: 'Prex',
    currencyName: 'Prex',
    bankName: 'KT Banque',
    prexPerEuro: 1000,
    maxTransactionAmount: 999_999_999,
    cooldowns: { balance: 3, history: 5, boutique: 3, buy: 10, topbanque: 5, card: 5 },
    adminRoles: [],
    staffRoles: [],
    centralBankReserve: 0,
  };
}

/**
 * Récupère la réserve centrale actuelle
 */
export async function getCentralReserve(): Promise<number> {
  const config = await loadConfig();
  return config.centralBankReserve ?? 0;
}

/**
 * Initialise la banque centrale avec un montant
 */
export async function initCentralBankReserve(amount: number): Promise<void> {
  const config = await loadConfig();
  config.centralBankReserve = amount;
  await writeJSON(CONFIG_FILE, config);
  await updateVoiceChannel();
}

/**
 * Ajuste la réserve centrale (delta positif ou négatif)
 */
export async function adjustCentralReserve(delta: number): Promise<number> {
  const config = await loadConfig();
  config.centralBankReserve = Math.max(0, (config.centralBankReserve ?? 0) + delta);
  await writeJSON(CONFIG_FILE, config);
  scheduleVoiceUpdate();
  return config.centralBankReserve;
}

/**
 * Enregistre l'ID du salon vocal économie
 */
export async function setVoiceChannelId(channelId: string): Promise<void> {
  const config = await loadConfig();
  config.voiceChannelId = channelId;
  await writeJSON(CONFIG_FILE, config);
}

/**
 * Met à jour le nom du salon vocal avec la réserve actuelle
 * (debounce 5s pour éviter le rate limit Discord)
 */
function scheduleVoiceUpdate(): void {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateVoiceChannel().catch(console.warn);
  }, 5000);
}

export async function updateVoiceChannel(): Promise<void> {
  if (!clientRef) return;
  const config = await loadConfig();
  if (!config.voiceChannelId) return;

  try {
    const channel = await clientRef.channels.fetch(config.voiceChannelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    const reserve = config.centralBankReserve ?? 0;
    const newName = `🏦 BC : ${formatPrex(reserve)}`;

    // Discord limite les renommages à 2/10min
    if ((channel as VoiceChannel).name !== newName) {
      await (channel as VoiceChannel).setName(newName);
    }
  } catch (err) {
    console.warn('[CentralBank] Impossible de mettre à jour le salon vocal:', err);
  }
}

export { loadConfig, defaultConfig };
