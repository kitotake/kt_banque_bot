-- ============================================================
-- KT Banque - Schéma MariaDB complet
-- Version: 2.0.0
-- Charset: utf8mb4
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── accounts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `accounts` (
  `id`         VARCHAR(20)  NOT NULL,
  `username`   VARCHAR(100) NOT NULL,
  `bank`       BIGINT       NOT NULL DEFAULT 0,
  `created_at` BIGINT       NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── cards ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cards` (
  `user_id`     VARCHAR(20)                        NOT NULL,
  `card_number` VARCHAR(9)                         NOT NULL,
  `username`    VARCHAR(100)                       NOT NULL,
  `status`      ENUM('ACTIVE','FROZEN','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at`  BIGINT                             NOT NULL,
  `frozen_at`   BIGINT                             NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_card_number` (`card_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── transactions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transactions` (
  `id`              VARCHAR(30)  NOT NULL,
  `user_id`         VARCHAR(20)  NOT NULL,
  `type`            VARCHAR(20)  NOT NULL,
  `amount`          BIGINT       NOT NULL,
  `balance_before`  BIGINT       NOT NULL,
  `balance_after`   BIGINT       NOT NULL,
  `description`     VARCHAR(500) NOT NULL,
  `performed_by`    VARCHAR(20)  NOT NULL,
  `related_user_id` VARCHAR(20)  NULL,
  `item_id`         VARCHAR(64)  NULL,
  `timestamp`       BIGINT       NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id`   (`user_id`),
  INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── purchases ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `purchases` (
  `id`             VARCHAR(30)  NOT NULL,
  `user_id`        VARCHAR(20)  NOT NULL,
  `item_id`        VARCHAR(64)  NOT NULL,
  `item_name`      VARCHAR(100) NOT NULL,
  `price`          BIGINT       NOT NULL,
  `transaction_id` VARCHAR(30)  NOT NULL,
  `timestamp`      BIGINT       NOT NULL,
  `refunded`       TINYINT(1)   NOT NULL DEFAULT 0,
  `refunded_by`    VARCHAR(20)  NULL,
  `refunded_at`    BIGINT       NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_item_id` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── shop_items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `shop_items` (
  `id`            VARCHAR(64)  NOT NULL,
  `name`          VARCHAR(100) NOT NULL,
  `price`         BIGINT       NOT NULL,
  `category`      VARCHAR(50)  NOT NULL,
  `description`   VARCHAR(500) NOT NULL,
  `enabled`       TINYINT(1)   NOT NULL DEFAULT 1,
  `stock`         INT          NOT NULL DEFAULT -1,
  `created_by`    VARCHAR(20)  NOT NULL,
  `created_at`    BIGINT       NOT NULL,
  `updated_at`    BIGINT       NULL,
  `sales_count`   INT          NOT NULL DEFAULT 0,
  `total_revenue` BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_enabled`  (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `logs` (
  `id`           VARCHAR(30)                              NOT NULL,
  `level`        ENUM('INFO','WARN','ERROR','CRITICAL')   NOT NULL DEFAULT 'INFO',
  `action`       VARCHAR(50)                              NOT NULL,
  `description`  TEXT                                     NOT NULL,
  `user_id`      VARCHAR(20)                              NULL,
  `performed_by` VARCHAR(20)                              NULL,
  `metadata`     JSON                                     NULL,
  `timestamp`    BIGINT                                   NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_action`    (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── config ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `config` (
  `key`   VARCHAR(50) NOT NULL,
  `value` TEXT        NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Valeurs par défaut
INSERT IGNORE INTO `config` (`key`, `value`) VALUES
  ('startingBalance',      '0'),
  ('currency',             'Prex'),
  ('currencyName',         'Prex'),
  ('bankName',             'KT Banque'),
  ('prexPerEuro',          '1000'),
  ('maxTransactionAmount', '999999999'),
  ('cooldown_balance',     '3'),
  ('cooldown_history',     '5'),
  ('cooldown_boutique',    '3'),
  ('cooldown_buy',         '10'),
  ('cooldown_topbanque',   '5'),
  ('cooldown_card',        '5'),
  ('adminRoles',           '[]'),
  ('staffRoles',           '[]'),
  ('centralBankReserve',   '0'),
  ('voiceChannelId',       '');

SET FOREIGN_KEY_CHECKS = 1;