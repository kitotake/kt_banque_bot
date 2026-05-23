// ============================================================
// KT Banque - Item Manager (façade shopManager)
// Ré-export pour compatibilité architecture modulaire
// ============================================================

export {
  getAllItems,
  getEnabledItems,
  getItemById,
  getCategories,
  getItemsByCategory,
  createItem,
  editItem,
  toggleItem,
  removeItem,
  recordSale,
  getSalesStats,
} from './shopManager';
