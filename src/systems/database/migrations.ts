// ============================================================
// KT Banque - Migrations MariaDB
// Crée les tables si elles n'existent pas
// ============================================================

import { execute } from './db';

export async function runMigrations(): Promise<void> {
  console.log('[DB] Exécution des migrations...');

  // ── accounts ────────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id          VARCHAR(20)   NOT NULL PRIMARY KEY,
      username    VARCHAR(100)  NOT NULL,
      bank        BIGINT        NOT NULL DEFAULT 0,
      created_at  BIGINT        NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── cards ────────────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS cards (
      user_id     VARCHAR(20)   NOT NULL PRIMARY KEY,
      card_number VARCHAR(9)    NOT NULL UNIQUE,
      username    VARCHAR(100)  NOT NULL,
      status      ENUM('ACTIVE','FROZEN','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
      created_at  BIGINT        NOT NULL,
      frozen_at   BIGINT        NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── transactions ─────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id               VARCHAR(30)   NOT NULL PRIMARY KEY,
      user_id          VARCHAR(20)   NOT NULL,
      type             VARCHAR(20)   NOT NULL,
      amount           BIGINT        NOT NULL,
      balance_before   BIGINT        NOT NULL,
      balance_after    BIGINT        NOT NULL,
      description      VARCHAR(500)  NOT NULL,
      performed_by     VARCHAR(20)   NOT NULL,
      related_user_id  VARCHAR(20)   NULL,
      item_id          VARCHAR(64)   NULL,
      timestamp        BIGINT        NOT NULL,
      INDEX idx_user_id   (user_id),
      INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── purchases ────────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS purchases (
      id              VARCHAR(30)   NOT NULL PRIMARY KEY,
      user_id         VARCHAR(20)   NOT NULL,
      item_id         VARCHAR(64)   NOT NULL,
      item_name       VARCHAR(100)  NOT NULL,
      price           BIGINT        NOT NULL,
      transaction_id  VARCHAR(30)   NOT NULL,
      timestamp       BIGINT        NOT NULL,
      refunded        TINYINT(1)    NOT NULL DEFAULT 0,
      refunded_by     VARCHAR(20)   NULL,
      refunded_at     BIGINT        NULL,
      INDEX idx_user_id  (user_id),
      INDEX idx_item_id  (item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── shop_items ───────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id            VARCHAR(64)   NOT NULL PRIMARY KEY,
      name          VARCHAR(100)  NOT NULL,
      price         BIGINT        NOT NULL,
      category      VARCHAR(50)   NOT NULL,
      description   VARCHAR(500)  NOT NULL,
      enabled       TINYINT(1)    NOT NULL DEFAULT 1,
      stock         INT           NOT NULL DEFAULT -1,
      created_by    VARCHAR(20)   NOT NULL,
      created_at    BIGINT        NOT NULL,
      updated_at    BIGINT        NULL,
      sales_count   INT           NOT NULL DEFAULT 0,
      total_revenue BIGINT        NOT NULL DEFAULT 0,
      INDEX idx_category (category),
      INDEX idx_enabled  (enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── logs ─────────────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id           VARCHAR(30)   NOT NULL PRIMARY KEY,
      level        ENUM('INFO','WARN','ERROR','CRITICAL') NOT NULL DEFAULT 'INFO',
      action       VARCHAR(50)   NOT NULL,
      description  TEXT          NOT NULL,
      user_id      VARCHAR(20)   NULL,
      performed_by VARCHAR(20)   NULL,
      metadata     JSON          NULL,
      timestamp    BIGINT        NOT NULL,
      INDEX idx_timestamp (timestamp),
      INDEX idx_action    (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── config ───────────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS config (
      \`key\`   VARCHAR(50)  NOT NULL PRIMARY KEY,
      \`value\` TEXT         NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Valeurs par défaut config
  const defaults: Record<string, unknown> = {
    startingBalance:      0,
    currency:             'Prex',
    currencyName:         'Prex',
    bankName:             'KT Banque',
    prexPerEuro:          1000,
    maxTransactionAmount: 999999999,
    cooldown_balance:     3,
    cooldown_history:     5,
    cooldown_boutique:    3,
    cooldown_buy:         10,
    cooldown_topbanque:   5,
    cooldown_card:        5,
    adminRoles:           JSON.stringify([]),
    staffRoles:           JSON.stringify([]),
    centralBankReserve:   0,
    voiceChannelId:       '',
  };

  for (const [key, value] of Object.entries(defaults)) {
    await execute(
      'INSERT IGNORE INTO config (`key`, `value`) VALUES (?, ?)',
      [key, String(value)]
    );
  }

  console.log('[DB] Migrations terminées ✅');
}
