// ============================================================
// KT Banque - Gestionnaire boutique (Prex)
// ============================================================

import { ShopItem, ShopData, OperationResult } from '../../types';
import { readJSON, writeJSON, createBackup } from '../bank/saveSystem';
import { cache } from '../cache/cacheManager';

const SHOP_FILE = 'shop.json';
const CACHE_KEY = 'shop_data';
const CACHE_TTL = 30_000;

async function loadShop(): Promise<ShopData> {
  const cached = cache.get<ShopData>(CACHE_KEY);
  if (cached) return cached;
  const data = await readJSON<ShopData>(SHOP_FILE, { items: [] });
  cache.set(CACHE_KEY, data, CACHE_TTL);
  return data;
}

async function saveShop(data: ShopData): Promise<void> {
  cache.delete(CACHE_KEY);
  await writeJSON(SHOP_FILE, data);
}

export async function getAllItems(): Promise<ShopItem[]> {
  return (await loadShop()).items;
}

export async function getEnabledItems(): Promise<ShopItem[]> {
  return (await loadShop()).items.filter(i => i.enabled && i.stock !== 0);
}

export async function getItemById(id: string): Promise<ShopItem | null> {
  return (await loadShop()).items.find(i => i.id === id) ?? null;
}

export async function getCategories(): Promise<string[]> {
  return [...new Set((await getEnabledItems()).map(i => i.category))].sort();
}

export async function getItemsByCategory(category: string): Promise<ShopItem[]> {
  return (await getEnabledItems()).filter(i => i.category === category);
}

export async function createItem(
  id: string, name: string, price: number, category: string,
  description: string, stock: number, createdBy: string
): Promise<OperationResult<ShopItem>> {
  const shop = await loadShop();
  if (shop.items.some(i => i.id === id)) {
    return { success: false, error: `Un article avec l'ID "${id}" existe déjà.` };
  }

  const item: ShopItem = {
    id, name, price, category, description,
    enabled: true, stock, createdBy,
    createdAt: Date.now(), salesCount: 0, totalRevenue: 0,
  };

  shop.items.push(item);
  await saveShop(shop);
  return { success: true, data: item };
}

export async function editItem(
  id: string,
  updates: Partial<Pick<ShopItem, 'name' | 'price' | 'category' | 'description' | 'stock'>>
): Promise<OperationResult<ShopItem>> {
  const shop = await loadShop();
  const idx = shop.items.findIndex(i => i.id === id);
  if (idx === -1) return { success: false, error: `Article "${id}" introuvable.` };

  shop.items[idx] = { ...shop.items[idx], ...updates, updatedAt: Date.now() };
  await saveShop(shop);
  return { success: true, data: shop.items[idx] };
}

export async function toggleItem(id: string): Promise<OperationResult<ShopItem>> {
  const shop = await loadShop();
  const idx = shop.items.findIndex(i => i.id === id);
  if (idx === -1) return { success: false, error: `Article "${id}" introuvable.` };

  shop.items[idx].enabled = !shop.items[idx].enabled;
  shop.items[idx].updatedAt = Date.now();
  await saveShop(shop);
  return { success: true, data: shop.items[idx] };
}

export async function removeItem(id: string): Promise<OperationResult<void>> {
  const shop = await loadShop();
  const before = shop.items.length;
  shop.items = shop.items.filter(i => i.id !== id);
  if (shop.items.length === before) return { success: false, error: `Article "${id}" introuvable.` };

  await createBackup(SHOP_FILE);
  await saveShop(shop);
  return { success: true };
}

export async function recordSale(itemId: string, price: number): Promise<void> {
  const shop = await loadShop();
  const idx = shop.items.findIndex(i => i.id === itemId);
  if (idx === -1) return;

  shop.items[idx].salesCount++;
  shop.items[idx].totalRevenue += price;

  if (shop.items[idx].stock > 0) {
    shop.items[idx].stock--;
    if (shop.items[idx].stock === 0) shop.items[idx].enabled = false;
  }

  await saveShop(shop);
}

export async function getSalesStats(): Promise<{
  totalRevenue: number;
  totalSales: number;
  topItems: ShopItem[];
}> {
  const items = (await loadShop()).items;
  return {
    totalRevenue: items.reduce((s, i) => s + i.totalRevenue, 0),
    totalSales: items.reduce((s, i) => s + i.salesCount, 0),
    topItems: [...items].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5),
  };
}
