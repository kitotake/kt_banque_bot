// ============================================================
// KT Banque - Pool de connexions MariaDB
// ============================================================

import mysql from 'mysql2/promise';

type DBValue =
  | string
  | number
  | boolean
  | Date
  | Buffer
  | null;

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      user: process.env.DB_USER ?? '',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: 'Z',
    });
  }

  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params?: DBValue[]
): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);

  return rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: DBValue[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);

  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  params?: DBValue[]
): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().execute(sql, params);

  return result as mysql.ResultSetHeader;
}

export async function testConnection(): Promise<void> {
  const conn = await getPool().getConnection();

  await conn.ping();

  conn.release();

  console.log('[DB] Connexion MariaDB OK');
}