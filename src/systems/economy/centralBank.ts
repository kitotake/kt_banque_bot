// ============================================================
// KT Banque - Banque Centrale (MariaDB)
// ============================================================

import { Client, VoiceChannel, ChannelType } from 'discord.js';
import {
  getCentralReserve,
  setCentralReserve,
  adjustCentralReserveDB,
  getVoiceChannelId,
  setVoiceChannelId,
  loadConfig,
} from '../database/configManager';
import { formatPrex } from '../../utils/format';

export { getCentralReserve, setVoiceChannelId, loadConfig };
export { adjustCentralReserveDB as adjustCentralReserve };

let clientRef: Client | null = null;
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

export function initCentralBank(client: Client): void {
  clientRef = client;
}

export async function initCentralBankReserve(amount: number): Promise<void> {
  await setCentralReserve(amount);
  await updateVoiceChannel();
}

function scheduleVoiceUpdate(): void {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateVoiceChannel().catch(console.warn);
  }, 5000);
}

export async function updateVoiceChannel(): Promise<void> {
  if (!clientRef) return;
  const channelId = await getVoiceChannelId();
  if (!channelId) return;

  try {
    const channel = await clientRef.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    const reserve = await getCentralReserve();
    const newName = `🏦 BC : ${formatPrex(reserve)}`;

    if ((channel as VoiceChannel).name !== newName) {
      await (channel as VoiceChannel).setName(newName);
    }
  } catch (err) {
    console.warn('[CentralBank] Impossible de mettre à jour le salon vocal:', err);
  }
}
