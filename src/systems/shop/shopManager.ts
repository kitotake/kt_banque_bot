// ============================================================
// KT Banque - Gestionnaire boutique (MariaDB)
// ============================================================

import { query, execute, queryOne } from '../database/db';
import { ShopItem, OperationResult } from '../../types';

type DBValue =
  | string
  | number
  | boolean
  | Date
  | Buffer
  | null;

interface ShopRow {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  enabled: number;
  stock: number;
  created_by: string;
  created_at: number;
  updated_at: number | null;
  sales_count: number;
  total_revenue: number;
}

function rowToItem(row: ShopRow): ShopItem {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    description: row.description,
    enabled: row.enabled === 1,
    stock: Number(row.stock),
    createdBy: row.created_by,
    createdAt: Number(row.created_at),
    updatedAt: row.updated_at ? Number(row.updated_at) : undefined,
    salesCount: Number(row.sales_count),
    totalRevenue: Number(row.total_revenue),
  };
}

export async function getAllItems(): Promise<ShopItem[]> {
  const rows = await query<ShopRow>(
    'SELECT * FROM shop_items ORDER BY created_at DESC'
  );

  return rows.map(rowToItem);
}

export async function getEnabledItems(): Promise<ShopItem[]> {
  const rows = await query<ShopRow>(
    'SELECT * FROM shop_items WHERE enabled = 1 AND stock != 0 ORDER BY category, name'
  );

  return rows.map(rowToItem);
}

export async function getItemById(id: string): Promise<ShopItem | null> {
  const row = await queryOne<ShopRow>(
    'SELECT * FROM shop_items WHERE id = ?',
    [id]
  );

  return row ? rowToItem(row) : null;
}

export async function getCategories(): Promise<string[]> {
  const rows = await query<{ category: string }>(
    'SELECT DISTINCT category FROM shop_items WHERE enabled = 1 AND stock != 0 ORDER BY category'
  );

  return rows.map(r => r.category);
}

export async function getItemsByCategory(
  category: string
): Promise<ShopItem[]> {
  const rows = await query<ShopRow>(
    'SELECT * FROM shop_items WHERE category = ? AND enabled = 1 AND stock != 0 ORDER BY name',
    [category]
  );

  return rows.map(rowToItem);
}

export async function createItem(
  id: string,
  name: string,
  price: number,
  category: string,
  description: string,
  stock: number,
  createdBy: string
): Promise<OperationResult<ShopItem>> {
  const existing = await getItemById(id);

  if (existing) {
    return {
      success: false,
      error: `Un article avec l'ID "${id}" existe déjà.`,
    };
  }

  const now = Date.now();

  await execute(
    `INSERT INTO shop_items (
      id,
      name,
      price,
      category,
      description,
      enabled,
      stock,
      created_by,
      created_at,
      sales_count,
      total_revenue
    )
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 0, 0)`,
    [id, name, price, category, description, stock, createdBy, now]
  );

  return {
    success: true,
    data: {
      id,
      name,
      price,
      category,
      description,
      enabled: true,
      stock,
      createdBy,
      createdAt: now,
      salesCount: 0,
      totalRevenue: 0,
    },
  };
}

export async function editItem(
  id: string,
  updates: Partial<
    Pick<ShopItem, 'name' | 'price' | 'category' | 'description' | 'stock'>
  >
): Promise<OperationResult<ShopItem>> {
  const existing = await getItemById(id);

  if (!existing) {
    return {
      success: false,
      error: `Article "${id}" introuvable.`,
    };
  }

  const fields: string[] = [];
  const values: DBValue[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.price !== undefined) {
    fields.push('price = ?');
    values.push(updates.price);
  }

  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }

  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (updates.stock !== undefined) {
    fields.push('stock = ?');
    values.push(updates.stock);
  }

  fields.push('updated_at = ?');

  values.push(Date.now());
  values.push(id);

  await execute(
    `UPDATE shop_items SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  const updated = await getItemById(id);

  return {
    success: true,
    data: updated!,
  };
}

export async function toggleItem(
  id: string
): Promise<OperationResult<ShopItem>> {
  const existing = await getItemById(id);

  if (!existing) {
    return {
      success: false,
      error: `Article "${id}" introuvable.`,
    };
  }

  await execute(
    'UPDATE shop_items SET enabled = NOT enabled, updated_at = ? WHERE id = ?',
    [Date.now(), id]
  );

  const updated = await getItemById(id);

  return {
    success: true,
    data: updated!,
  };
}

export async function removeItem(
  id: string
): Promise<OperationResult<void>> {
  const existing = await getItemById(id);

  if (!existing) {
    return {
      success: false,
      error: `Article "${id}" introuvable.`,
    };
  }

  await execute(
    'DELETE FROM shop_items WHERE id = ?',
    [id]
  );

  return {
    success: true,
  };
}

export async function recordSale(
  itemId: string,
  price: number
): Promise<void> {
  await execute(
    `UPDATE shop_items
     SET sales_count   = sales_count + 1,
         total_revenue = total_revenue + ?,
         stock         = CASE WHEN stock > 0 THEN stock - 1 ELSE stock END,
         enabled       = CASE WHEN stock = 1 THEN 0 ELSE enabled END,
         updated_at    = ?
     WHERE id = ?`,
    [price, Date.now(), itemId]
  );
}

export async function getSalesStats(): Promise<{
  totalRevenue: number;
  totalSales: number;
  topItems: ShopItem[];
}> {
  const [stats] = await query<{
    total_revenue: number;
    total_sales: number;
  }>(
    'SELECT SUM(total_revenue) as total_revenue, SUM(sales_count) as total_sales FROM shop_items'
  );

  const topRows = await query<ShopRow>(
    'SELECT * FROM shop_items ORDER BY sales_count DESC LIMIT 5'
  );

  return {
    totalRevenue: Number(stats?.total_revenue ?? 0),
    totalSales: Number(stats?.total_sales ?? 0),
    topItems: topRows.map(rowToItem),
  };
}