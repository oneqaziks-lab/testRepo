-- ============================================================
--  Yuriko Hub — схема баз данных для двух платформ
--  Подключение: mysql --host=localhost --user=root   (root БЕЗ пароля)
--
--  yarikodb  → Rave     (мессенджер с ботами-верификаторами и 2FA)
--  ykotube   → YkoTube  (видеохостинг, вход только через Rave)
--
--  В демо-сервере (server/db.js) эти же таблицы реализованы
--  как JSON-файлы в server/data/ — структура один в один.
-- ============================================================

-- ---------- база Rave ----------
CREATE DATABASE IF NOT EXISTS yarikodb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yarikodb;

CREATE TABLE IF NOT EXISTS users (
  id                 CHAR(36) PRIMARY KEY,
  username           VARCHAR(20) UNIQUE NOT NULL,
  pass_hash          CHAR(64) NOT NULL,            -- SHA-256
  totp_secret        VARCHAR(64) NOT NULL,         -- секрет 2FA
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  verified_by        VARCHAR(40),                  -- какой верификатор подтвердил регистрацию
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- боты-верификаторы: у каждого свой access_code для входа в систему хаба
CREATE TABLE IF NOT EXISTS verificators (
  id          CHAR(36) PRIMARY KEY,
  username    VARCHAR(40) UNIQUE NOT NULL,         -- @Yuriko_VerifyBot и т.п.
  display     VARCHAR(80) NOT NULL,
  descr       TEXT,
  access_code CHAR(6) NOT NULL,                    -- код верификатора
  secret      VARCHAR(64) NOT NULL,                -- TOTP-секрет бота
  active      BOOLEAN DEFAULT TRUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- одноразовые коды регистрации и 2FA (хранится только хэш!)
CREATE TABLE IF NOT EXISTS codes (
  id         CHAR(36) PRIMARY KEY,
  user_id    VARCHAR(64) NOT NULL,                 -- id пользователя или 'reg:<bot>'
  kind       ENUM('register','2fa','2fa-setup') NOT NULL,
  code_hash  CHAR(64) NOT NULL,
  expires_at BIGINT NOT NULL,                      -- unix-ms, TTL = 5 минут
  attempts   INT DEFAULT 0,                        -- максимум 5 попыток
  issuer     VARCHAR(40),                          -- выдавший бот
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id         CHAR(36) PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  token      CHAR(48) UNIQUE NOT NULL,
  app        VARCHAR(20) DEFAULT 'rave',           -- rave | ykotube
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bots (
  id             CHAR(36) PRIMARY KEY,
  verificator_id CHAR(36) NOT NULL,
  username       VARCHAR(40) UNIQUE NOT NULL,
  display        VARCHAR(80) NOT NULL,
  commands       JSON,
  FOREIGN KEY (verificator_id) REFERENCES verificators(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id         CHAR(36) PRIMARY KEY,
  bot_id     CHAR(36) NOT NULL,
  sender     VARCHAR(40) NOT NULL,
  body       TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- ---------- база YkoTube ----------
CREATE DATABASE IF NOT EXISTS ykotube CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ykotube;

-- канал = профиль, жёстко привязан к аккаунту Rave (регистрация только через Rave)
CREATE TABLE IF NOT EXISTS channels (
  id            CHAR(36) PRIMARY KEY,
  name          VARCHAR(60) NOT NULL,
  avatar        VARCHAR(8) DEFAULT '🎥',
  rave_username VARCHAR(20),
  rave_user_id  CHAR(36) UNIQUE,                   -- FK на yarikodb.users (логически)
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
  id          CHAR(36) PRIMARY KEY,
  channel_id  CHAR(36) NOT NULL,
  title       VARCHAR(120) NOT NULL,
  emoji       VARCHAR(8) DEFAULT '📼',
  views       INT DEFAULT 0,
  tags        JSON,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
  id        CHAR(36) PRIMARY KEY,
  video_id  CHAR(36) NOT NULL,
  user_id   CHAR(36) NOT NULL,                     -- из yarikodb.users
  UNIQUE KEY uniq_like (video_id, user_id),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id         CHAR(36) PRIMARY KEY,
  video_id   CHAR(36) NOT NULL,
  user_id    CHAR(36) NOT NULL,
  body       TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- ---------- начальные боты-верификаторы ----------
INSERT INTO yarikodb.verificators (id, username, display, descr, access_code, secret) VALUES
  (UUID(), 'Yuriko_VerifyBot',  'Yuriko Verify Bot 🛡️', 'Коды регистрации и 2FA', '486656', 'YURIKO-SEEDVERIFY000001'),
  (UUID(), 'Yuriko_AuthBot',    'Yuriko Auth Bot 🔐',   'Управление 2FA',          '174666', 'YURIKO-SEEDAUTH0000001'),
  (UUID(), 'Yuriko_SupportBot', 'Yuriko Support 🤖',    'Помощь по аккаунту',      '159681', 'YURIKO-SEEDSUPPORT00001')
ON DUPLICATE KEY UPDATE display = VALUES(display);
