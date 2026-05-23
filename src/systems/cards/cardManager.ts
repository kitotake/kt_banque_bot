// ============================================================
// KT Banque - Gestionnaire Cartes Bancaires RP
// Génération, gel, info des cartes virtuelles
// ============================================================

import { BankCard, CardsData, OperationResult, CardStatus } from '../../types';
import { readJSON, writeJSON } from '../bank/saveSystem';
import { cache } from '../cache/cacheManager';

const CARDS_FILE = 'cards.json';
const CACHE_KEY = 'cards_data';
const CACHE_TTL = 30_000;

async function loadCards(): Promise<CardsData> {
  const cached = cache.get<CardsData>(CACHE_KEY);
  if (cached) return cached;
  const data = await readJSON<CardsData>(CARDS_FILE, {});
  cache.set(CACHE_KEY, data, CACHE_TTL);
  return data;
}

async function saveCards(data: CardsData): Promise<void> {
  cache.delete(CACHE_KEY);
  await writeJSON(CARDS_FILE, data);
}

/**
 * Génère un numéro de carte unique à partir de l'ID Discord
 * Format: XXXX-XXXX
 */
function generateCardNumber(userId: string): string {
  // Hash déterministe de l'ID Discord
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const part1 = String(abs % 10000).padStart(4, '0');
  const part2 = String(Math.floor(abs / 10000) % 10000).padStart(4, '0');
  return `${part1}-${part2}`;
}

/**
 * Crée une carte pour un utilisateur
 */
export async function createCard(
  userId: string,
  username: string
): Promise<OperationResult<BankCard>> {
  const cards = await loadCards();

  if (cards[userId]) {
    return { success: false, error: 'Vous possédez déjà une carte KT Banque.' };
  }

  const card: BankCard = {
    id: generateCardNumber(userId),
    userId,
    username,
    status: 'ACTIVE',
    createdAt: Date.now(),
  };

  cards[userId] = card;
  await saveCards(cards);
  return { success: true, data: card };
}

/**
 * Récupère la carte d'un utilisateur
 */
export async function getCard(userId: string): Promise<BankCard | null> {
  const cards = await loadCards();
  return cards[userId] ?? null;
}

/**
 * Récupère ou crée une carte automatiquement
 */
export async function getOrCreateCard(userId: string, username: string): Promise<BankCard> {
  const existing = await getCard(userId);
  if (existing) return existing;
  const result = await createCard(userId, username);
  return result.data!;
}

/**
 * Gèle / dégèle une carte
 */
export async function toggleFreezeCard(userId: string): Promise<OperationResult<BankCard>> {
  const cards = await loadCards();

  if (!cards[userId]) {
    return { success: false, error: 'Aucune carte trouvée. Créez-en une avec `/card create`.' };
  }

  const card = cards[userId];

  if (card.status === 'CANCELLED') {
    return { success: false, error: 'Cette carte est annulée et ne peut plus être modifiée.' };
  }

  if (card.status === 'ACTIVE') {
    card.status = 'FROZEN';
    card.frozenAt = Date.now();
  } else {
    card.status = 'ACTIVE';
    delete card.frozenAt;
  }

  cards[userId] = card;
  await saveCards(cards);
  return { success: true, data: card };
}

/**
 * Statut lisible d'une carte
 */
export function cardStatusLabel(status: CardStatus): string {
  const map: Record<CardStatus, string> = {
    ACTIVE: '✅ Active',
    FROZEN: '🧊 Gelée',
    CANCELLED: '❌ Annulée',
  };
  return map[status];
}

/**
 * Couleur embed selon statut
 */
export function cardStatusColor(status: CardStatus): number {
  const map: Record<CardStatus, number> = {
    ACTIVE: 0x2ecc71,
    FROZEN: 0x3498db,
    CANCELLED: 0xe74c3c,
  };
  return map[status];
}
