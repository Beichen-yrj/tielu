-- ============================================================
-- 铁路危货双重预防机制评估系统 · 数据库初始化脚本
-- 适用：MySQL 5.7 / 8.0
--
-- 连接参数（与 backend/.env 默认值一致）：
--   主机 127.0.0.1   端口 3306   账号 root   密码 123456
--   数据库 rail_safety
--
-- 三种执行方式（任选其一）：
--   1) 双击同目录的“初始化数据库.bat”，自动带上上面的连接参数执行本脚本
--   2) 命令行：
--      mysql -h127.0.0.1 -P3306 -uroot -p123456 --default-character-set=utf8mb4 < init_db.sql
--   3) Navicat / Workbench / DBeaver：打开本文件整体执行（连接用上面的账号密码）
--
-- 执行结果：
--   · 创建数据库 rail_safety 与 5 张表（users / auth_sessions / assessments / hazard_assessments / feedbacks）
--   · 创建管理员账号：用户名 admin，密码 admin123456（登录后可在“个人中心”修改）
--
-- 安全说明：
--   · 脚本可重复执行：表已存在不会重建，admin 已存在只校正角色与密码，不会清空既有数据
--   · 若 MySQL 账号密码不是 root / 123456，执行完请修改 backend/.env 的 DATABASE_URL 并重启后端
-- ============================================================

CREATE DATABASE IF NOT EXISTS rail_safety DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE rail_safety;

SET NAMES utf8mb4;

-- ---------- users：用户表：账号、显示名、密码摘要（bcrypt）、角色 ----------
    CREATE TABLE IF NOT EXISTS `users` (
      `id` int NOT NULL AUTO_INCREMENT,
      `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      `display_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      `avatar_data` longtext COLLATE utf8mb4_unicode_ci,
      `password_hash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      `role` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
      `is_active` tinyint(1) NOT NULL,
      `created_at` datetime NOT NULL,
      `updated_at` datetime NOT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `ix_users_username` (`username`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- hazard_assessments：安全管理员危险源静态/动态评估记录 ----------
    CREATE TABLE IF NOT EXISTS `hazard_assessments` (
      `id` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
      `user_id` int NOT NULL,
      `task_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
      `bureau` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
      `station` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
      `area` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      `cargo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      `un_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
      `inspector` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      `hazard_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `stage` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `dimension` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `hazard_name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
      `basis` text COLLATE utf8mb4_unicode_ci NOT NULL,
      `assessment_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `data_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      `measured_value` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      `unit` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
      `standard_value` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
      `static_result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `likelihood` int NOT NULL,
      `severity` int NOT NULL,
      `score` int NOT NULL,
      `risk` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `has_hazard` tinyint(1) NOT NULL,
      `finding` text COLLATE utf8mb4_unicode_ci NOT NULL,
      `action` text COLLATE utf8mb4_unicode_ci NOT NULL,
      `photo_name` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
      `photo_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `rectification_photo_name` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
      `rectification_photo_data` longtext COLLATE utf8mb4_unicode_ci,
      `review_result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
      `rectification_log` json,
      `review_measured_value` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
      `review_standard_value` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
      `workflow_version` int NOT NULL DEFAULT 0,
      `created_label` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
      `created_at` datetime NOT NULL,
      `updated_at` datetime NOT NULL,
      PRIMARY KEY (`id`),
      KEY `ix_hazard_assessments_user_id` (`user_id`),
      CONSTRAINT `hazard_assessments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- auth_sessions：登录会话表：访问令牌标识、有效期、注销时间 ----------
    CREATE TABLE IF NOT EXISTS `auth_sessions` (
      `id` int NOT NULL AUTO_INCREMENT,
      `token_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      `user_id` int NOT NULL,
      `expires_at` datetime NOT NULL,
      `revoked_at` datetime DEFAULT NULL,
      `created_at` datetime NOT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `ix_auth_sessions_token_id` (`token_id`),
      KEY `ix_auth_sessions_user_id` (`user_id`),
      CONSTRAINT `auth_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- assessments：评估任务表：检测数据、静态检查结果、风险结论与措施 ----------
    CREATE TABLE IF NOT EXISTS `assessments` (
      `id` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
      `user_id` int NOT NULL,
      `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
      `station` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
      `area` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      `cargo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      `un_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
      `detector` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
      `temperature` float NOT NULL,
      `pressure` float NOT NULL,
      `concentration` float NOT NULL,
      `static_checks` json NOT NULL,
      `likelihood` int NOT NULL,
      `severity` int NOT NULL,
      `risk` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `score` int NOT NULL,
      `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `findings` json NOT NULL,
      `measures` json NOT NULL,
      `created_label` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
      `created_at` datetime NOT NULL,
      `updated_at` datetime NOT NULL,
      PRIMARY KEY (`id`),
      KEY `ix_assessments_user_id` (`user_id`),
      CONSTRAINT `assessments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- feedbacks：意见反馈表：用户提交的问题、管理员回复与时间 ----------
    CREATE TABLE IF NOT EXISTS `feedbacks` (
      `id` int NOT NULL AUTO_INCREMENT,
      `user_id` int NOT NULL,
      `category` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
      `title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
      `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
      `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      `reply` text COLLATE utf8mb4_unicode_ci,
      `replied_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `replied_at` datetime DEFAULT NULL,
      `created_at` datetime NOT NULL,
      `updated_at` datetime NOT NULL,
      PRIMARY KEY (`id`),
      KEY `ix_feedbacks_user_id` (`user_id`),
      CONSTRAINT `feedbacks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 管理员账号（用户名 admin / 密码 admin123456） ----------
INSERT INTO users (username, display_name, password_hash, role, is_active, created_at, updated_at)
VALUES ('admin', '系统管理员', '$2b$12$5B2NYkE1gVrDeRGK5Lxn/uyooNWo2nwFmtkrNj.AxlOvPDFBtStPa', 'admin', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  display_name = '系统管理员',
  password_hash = VALUES(password_hash),
  role = 'admin',
  is_active = 1,
  updated_at = NOW();

-- ---------- 可选：把已有账号提升为管理员（把 username 换成对应账号） ----------
-- UPDATE users SET role = 'admin', updated_at = NOW() WHERE username = '替换成你的账号';

-- ---------- 执行结果自检（应显示：表数量 4、管理员数量大于等于 1） ----------
SELECT '数据库初始化完成' AS 执行结果,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'rail_safety') AS 表数量,
       (SELECT COUNT(*) FROM users WHERE role = 'admin') AS 管理员数量,
       (SELECT COUNT(*) FROM users) AS 账号总数;

SELECT id, username, display_name, role, is_active FROM users ORDER BY id;
