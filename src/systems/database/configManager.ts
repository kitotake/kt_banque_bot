// ============================================================
// KT Banque - Gestionnaire de configuration (MariaDB)
// ============================================================

import { query, execute, queryOne } from './db';
import { BotConfig } from '../../types';

interface ConfigRow { key: string; value: string }

async function get(key: string): Promise<string | null> {
  const row = await queryOne<ConfigRow>(
    'SELECT `value` FROM config WHERE `key` = ?', [key]
  );
  return row?.value ?? null;
}

async function set(key: string, value: unknown): Promise<void> {
  await execute(
    'INSERT INTO config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [key, String(value)]
  );
}

export async function loadConfig(): Promise<BotConfig> {
  const rows = await query<ConfigRow>('SELECT `key`, `value` FROM config');
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const parseArr = (v: string | undefined): string[] => {
    try { return JSON.parse(v ?? '[]'); } catch { return []; }
  };

  return {
    startingBalance:      parseInt(map.startingBalance      ?? '0', 10),
    currency:             map.currency                      ?? 'Prex',
    currencyName:         map.currencyName                  ?? 'Prex',
    bankName:             map.bankName                      ?? 'KT Banque',
    prexPerEuro:          parseInt(map.prexPerEuro          ?? '1000', 10),
    maxTransactionAmount: parseInt(map.maxTransactionAmount ?? '999999999', 10),
    cooldowns: {
      balance:   parseInt(map.cooldown_balance   ?? '3',  10),
      history:   parseInt(map.cooldown_history   ?? '5',  10),
      boutique:  parseInt(map.cooldown_boutique  ?? '3',  10),
      buy:       parseInt(map.cooldown_buy       ?? '10', 10),
      topbanque: parseInt(map.cooldown_topbanque ?? '5',  10),
      card:      parseInt(map.cooldown_card      ?? '5',  10),
    },
    adminRoles:         parseArr(map.adminRoles),
    staffRoles:         parseArr(map.staffRoles),
    voiceChannelId:     map.voiceChannelId || undefined,
    centralBankReserve: parseInt(map.centralBankReserve ?? '0', 10),
  };
}

export async function getCentralReserve(): Promise<number> {
  const v = await get('centralBankReserve');
  return parseInt(v ?? '0', 10);
}

export async function setCentralReserve(amount: number): Promise<void> {
  await set('centralBankReserve', amount);
}

export async function adjustCentralReserveDB(delta: number): Promise<number> {
  await execute(
    'UPDATE config SET `value` = GREATEST(0, CAST(`value` AS SIGNED) + ?) WHERE `key` = ?',
    [delta, 'centralBankReserve']
  );
  const newVal = await getCentralReserve();
  return newVal;
}

export async function setVoiceChannelId(channelId: string): Promise<void> {
  await set('voiceChannelId', channelId);
}

export async function getVoiceChannelId(): Promise<string | null> {
  const v = await get('voiceChannelId');
  return v || null;
}

export async function getStaffRoles(): Promise<string[]> {
  const admin  = await get('adminRoles');
  const staff  = await get('staffRoles');
  const parseArr = (v: string | null): string[] => {
    try { return JSON.parse(v ?? '[]'); } catch { return []; }
  };
  return [...parseArr(admin), ...parseArr(staff)];
}
