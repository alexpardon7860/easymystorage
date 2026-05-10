-- ============================================================
-- User Management System - Database Schema
-- Engine: MySQL 5.7+ / MariaDB 10.3+
-- ============================================================

-- Create & select database
CREATE DATABASE IF NOT EXISTS `myproject`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `myproject`;

-- Drop table if rebuilding from scratch (comment out in production)
-- DROP TABLE IF EXISTS `users`;

-- ============================================================
-- users table
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`            INT(11)         NOT NULL AUTO_INCREMENT,
    `name`          VARCHAR(100)    NOT NULL,
    `email`         VARCHAR(191)    NOT NULL,
    `password`      VARCHAR(255)    DEFAULT NULL COMMENT 'NULL for Google OAuth users',
    `role`          ENUM('admin','user') NOT NULL DEFAULT 'user',
    `auth_provider` ENUM('manual','google') NOT NULL DEFAULT 'manual',
    `google_id`     VARCHAR(100)    DEFAULT NULL COMMENT 'Google sub (unique user ID)',
    `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_email`     (`email`),
    UNIQUE KEY `uq_google_id` (`google_id`),
    INDEX  `idx_role`          (`role`),
    INDEX  `idx_auth_provider` (`auth_provider`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores all registered users — manual and Google OAuth';

-- ============================================================
-- Seed data (optional demo records — remove before production)
-- Password for all demo users: "password123"  (bcrypt hash below)
-- ============================================================

INSERT IGNORE INTO `users` (`name`, `email`, `password`, `role`, `auth_provider`) VALUES
(
    'Super Admin',
    'admin@demo.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    'manual'
),
(
    'John Doe',
    'john@demo.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'user',
    'manual'
),
(
    'Jane Smith',
    'jane@demo.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'user',
    'manual'
);

-- ============================================================
-- Verification queries (run manually to confirm setup)
-- ============================================================
-- SELECT * FROM users;
-- DESCRIBE users;
