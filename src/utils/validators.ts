// ============================================================
// KT Banque - Validateurs (Prex)
// ============================================================

/**
 * Valide un montant en Prex
 * Input: entier en Prex
 */
export function validateAndParseAmount(input: number): { ok: true; prex: number } | { ok: false; error: string } {
  if (!Number.isFinite(input) || isNaN(input)) {
    return { ok: false, error: 'Montant invalide.' };
  }
  if (input <= 0) {
    return { ok: false, error: 'Le montant doit être supérieur à 0 Prex.' };
  }
  if (input > 999_999_999) {
    return { ok: false, error: 'Montant maximum: 999 999 999 Prex.' };
  }
  if (!Number.isInteger(input)) {
    return { ok: false, error: 'Le montant doit être un entier (pas de décimales).' };
  }
  return { ok: true, prex: input };
}

export function validateItemName(name: string): string | null {
  if (!name || name.trim().length < 2) return 'Le nom doit faire au moins 2 caractères.';
  if (name.length > 100) return 'Le nom ne peut pas dépasser 100 caractères.';
  return null;
}

export function validateItemDescription(desc: string): string | null {
  if (!desc || desc.trim().length < 5) return 'La description doit faire au moins 5 caractères.';
  if (desc.length > 500) return 'La description ne peut pas dépasser 500 caractères.';
  return null;
}

export function validateCategory(cat: string): string | null {
  if (!cat || cat.trim().length < 2) return 'La catégorie doit faire au moins 2 caractères.';
  if (cat.length > 50) return 'La catégorie ne peut pas dépasser 50 caractères.';
  return null;
}

export function validateStock(stock: number): string | null {
  if (!Number.isInteger(stock)) return 'Le stock doit être un entier.';
  if (stock < -1) return 'Stock minimum: -1 (illimité).';
  if (stock > 100_000) return 'Stock maximum: 100 000.';
  return null;
}

export function validateReason(reason: string): string | null {
  if (!reason || reason.trim().length < 3) return 'Le motif doit faire au moins 3 caractères.';
  if (reason.length > 200) return 'Le motif ne peut pas dépasser 200 caractères.';
  return null;
}

export function isValidSnowflake(id: string): boolean {
  return /^\d{17,20}$/.test(id);
}
