// ============================================================
// KT Banque - Utilitaires de formatage
// Monnaie, dates, pagination, texte
// ============================================================

/**
 * Formate un montant en centimes vers une chaîne lisible en euros
 * Exemple: 150000 → "1 500,00€"
 */
export function formatMoney(cents: number): string {
  const euros = cents / 100;
  return euros.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '€';
}

/**
 * Formate un montant avec signe (+ ou -)
 */
export function formatMoneyWithSign(cents: number, type: 'positive' | 'negative'): string {
  const sign = type === 'positive' ? '+' : '-';
  return `${sign}${formatMoney(Math.abs(cents))}`;
}

/**
 * Formate un timestamp Discord (<t:UNIX:R> = relatif)
 */
export function formatTimestamp(ts: number, style: 'R' | 'F' | 'D' | 'T' | 'f' | 'd' | 't' = 'R'): string {
  const seconds = Math.floor(ts / 1000);
  return `<t:${seconds}:${style}>`;
}

/**
 * Formate une date en français lisible
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
 * Tronque une chaîne si elle dépasse la longueur max
 */
export function truncate(str: string, max: number = 100): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

/**
 * Retourne l'emoji correspondant au type de transaction
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
 * Retourne le label FR du type de transaction
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
 * Génère une barre de progression (pour stocks, etc.)
 */
export function progressBar(current: number, max: number, length: number = 10): string {
  if (max <= 0) return '∞ Illimité';
  const ratio = Math.min(current / max, 1);
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` (${current}/${max})`;
}

/**
 * Formate un stock pour affichage boutique
 */
export function formatStock(stock: number): string {
  if (stock === -1) return '♾️ Illimité';
  if (stock === 0) return '❌ Rupture de stock';
  if (stock <= 5) return `⚠️ ${stock} restant${stock > 1 ? 's' : ''}`;
  return `✅ ${stock} en stock`;
}

/**
 * Crée des informations de pagination
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
  const pageItems = items.slice(start, start + pageSize);

  return { items: pageItems, total, pages, page: safePage };
}
