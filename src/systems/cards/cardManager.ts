// ============================================================
// KT Banque - Gestionnaire Cartes Bancaires (MariaDB)
// ============================================================

import { execute, queryOne } from '../database/db';
import { BankCard, CardsData, OperationResult, CardStatus } from '../../types';

interface CardRow {
  user_id:     string;
  card_number: string;
  username:    string;
  status:      CardStatus;
  created_at:  number;
  frozen_at:   number | null;
}

function rowToCard(row: CardRow): BankCard {
  return {
    id:        row.card_number,
    userId:    row.user_id,
    username:  row.username,
    status:    row.status,
    createdAt: Number(row.created_at),
    frozenAt:  row.frozen_at ? Number(row.frozen_at) : undefined,
  };
}

function generateCardNumber(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const abs   = Math.abs(hash);
  const part1 = String(abs % 10000).padStart(4, '0');
  const part2 = String(Math.floor(abs / 10000) % 10000).padStart(4, '0');
  return `${part1}-${part2}`;
}

export async function createCard(userId: string, username: string): Promise<OperationResult<BankCard>> {
  const existing = await getCard(userId);
  if (existing) return { success: false, error: 'Vous possédez déjà une carte KT Banque.' };

  const cardNumber = generateCardNumber(userId);
  const now        = Date.now();

  await execute(
    'INSERT INTO cards (user_id, card_number, username, status, created_at) VALUES (?, ?, ?, \'ACTIVE\', ?)',
    [userId, cardNumber, username, now]
  );

  return { success: true, data: { id: cardNumber, userId, username, status: 'ACTIVE', createdAt: now } };
}

export async function getCard(userId: string): Promise<BankCard | null> {
  const row = await queryOne<CardRow>('SELECT * FROM cards WHERE user_id = ?', [userId]);
  return row ? rowToCard(row) : null;
}

export async function getOrCreateCard(userId: string, username: string): Promise<BankCard> {
  const existing = await getCard(userId);
  if (existing) return existing;
  const result = await createCard(userId, username);
  return result.data!;
}

export async function toggleFreezeCard(userId: string): Promise<OperationResult<BankCard>> {
  const card = await getCard(userId);
  if (!card)                       return { success: false, error: 'Aucune carte trouvée. Créez-en une avec `/card create`.' };
  if (card.status === 'CANCELLED') return { success: false, error: 'Cette carte est annulée et ne peut plus être modifiée.' };

  if (card.status === 'ACTIVE') {
    const now = Date.now();
    await execute('UPDATE cards SET status = \'FROZEN\', frozen_at = ? WHERE user_id = ?', [now, userId]);
    return { success: true, data: { ...card, status: 'FROZEN', frozenAt: now } };
  } else {
    await execute('UPDATE cards SET status = \'ACTIVE\', frozen_at = NULL WHERE user_id = ?', [userId]);
    return { success: true, data: { ...card, status: 'ACTIVE', frozenAt: undefined } };
  }
}

export function cardStatusLabel(status: CardStatus): string {
  const map: Record<CardStatus, string> = {
    ACTIVE:    '✅ Active',
    FROZEN:    '🧊 Gelée',
    CANCELLED: '❌ Annulée',
  };
  return map[status];
}

export function cardStatusColor(status: CardStatus): number {
  const map: Record<CardStatus, number> = {
    ACTIVE:    0x2ecc71,
    FROZEN:    0x3498db,
    CANCELLED: 0xe74c3c,
  };
  return map[status];
}
