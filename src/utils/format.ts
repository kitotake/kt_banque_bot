// ============================================================
// KT Banque - Formatage Prex
// 1000 Prex = 1 € | Stockage en Prex (entiers)
// ============================================================

const PREX_PER_EURO = 1000;

/**
 * Formate un montant Prex : 50000 → "50 000 Prex"
 */
export function formatPrex(prex: number): string {
  return `${Math.round(prex).toLocaleString('fr-FR')} Prex`;
}

/**
 * Formate avec équivalent euro : 50000 → "50 000 Prex (50 €)"
 */
export function formatPrexWithEuro(prex: number): string {
  const euros = prex / PREX_PER_EURO;
  const eurosStr = euros.toLocaleString('fr-FR', {
    minimumFractionDigits: euros % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${Math.round(prex).toLocaleString('fr-FR')} Prex (${eurosStr} €)`;
}

/**
 * Formate avec signe : +50 000 Prex ou -50 000 Prex
 */
export function formatPrexSigned(prex: number, positive: boolean): string {
  const sign = positive ? '+' : '-';
  return `${sign}${Math.abs(Math.round(prex)).toLocaleString('fr-FR')} Prex`;
}

/**
 * Convertit euros → Prex
 */
export function euroToPrex(euro: number): number {
  return Math.round(euro * PREX_PER_EURO);
}

/**
 * Convertit Prex → euros (float)
 */
export function prexToEuro(prex: number): number {
  return prex / PREX_PER_EURO;
}

/**
 * Alias formatMoney → formatPrex (compat)
 */
export const formatMoney = formatPrex;

/**
 * Formate un timestamp Discord
 */
export function formatTimestamp(ts: number, style: 'R' | 'F' | 'D' | 'T' | 'f' | 'd' | 't' = 'R'): string {
  return `<t:${Math.floor(ts / 1000)}:${style}>`;
}

/**
 * Formate une date en français
 */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Tronque une chaîne
 */
export function truncate(str: string, max = 100): string {
  return str.length <= max ? str : str.slice(0, max - 3) + '...';
}

/**
 * Emoji de transaction
 */
export function transactionEmoji(type: string): string {
  const map: Record<string, string> = {
    ADD: '💰',
    REMOVE: '💸',
    TRANSFER_IN: '📥',
    TRANSFER_OUT: '📤',
    PURCHASE: '🛒',
    REFUND: '↩️',
    RESET: '🔄',
    ACCOUNT_CREATED: '🏦',
  };
  return map[type] ?? '📋';
}

/**
 * Label FR de transaction
 */
export function transactionLabel(type: string): string {
  const map: Record<string, string> = {
    ADD: 'Crédit admin',
    REMOVE: 'Débit admin',
    TRANSFER_IN: 'Virement reçu',
    TRANSFER_OUT: 'Virement envoyé',
    PURCHASE: 'Achat boutique',
    REFUND: 'Remboursement',
    RESET: 'Reset compte',
    ACCOUNT_CREATED: 'Création compte',
  };
  return map[type] ?? type;
}

/**
 * Pagination générique
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; pages: number; page: number } {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, pages, page: safePage };
}

/**
 * Formate un stock
 */
export function formatStock(stock: number): string {
  if (stock === -1) return '♾️ Illimité';
  if (stock === 0) return '❌ Rupture de stock';
  if (stock <= 5) return `⚠️ ${stock} restant${stock > 1 ? 's' : ''}`;
  return `✅ ${stock} en stock`;
}
