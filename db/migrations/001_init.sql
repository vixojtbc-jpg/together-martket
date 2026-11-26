-- 001_init.sql : 초기 스키마
-- 시간 컬럼은 모두 UTC로 저장한다.

CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  nickname       VARCHAR(50)  NOT NULL,
  role           ENUM('USER', 'HOST', 'ADMIN') NOT NULL DEFAULT 'USER',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_buys (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  host_id           INT UNSIGNED NOT NULL,
  title             VARCHAR(100) NOT NULL,
  description       TEXT NOT NULL,
  image_path        VARCHAR(255) NULL,
  original_price    INT UNSIGNED NOT NULL,
  sale_price        INT UNSIGNED NOT NULL,
  target_quantity   INT UNSIGNED NOT NULL,
  max_quantity      INT UNSIGNED NULL,
  current_quantity  INT UNSIGNED NOT NULL DEFAULT 0,
  deadline_at       DATETIME NOT NULL,
  status            ENUM('RECRUITING', 'SUCCEEDED', 'CLOSED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'RECRUITING',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_group_buys_host (host_id),
  KEY idx_group_buys_status_deadline (status, deadline_at),
  CONSTRAINT fk_group_buys_host FOREIGN KEY (host_id) REFERENCES users (id),
  CONSTRAINT chk_group_buys_price CHECK (sale_price <= original_price),
  CONSTRAINT chk_group_buys_target CHECK (target_quantity > 0),
  CONSTRAINT chk_group_buys_max CHECK (max_quantity IS NULL OR max_quantity >= target_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 같은 사용자의 중복 참여는 기존 행의 수량을 늘리는 방식이므로 (공구, 사용자)는 유일하다.
CREATE TABLE participations (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_buy_id  INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  quantity      INT UNSIGNED NOT NULL,
  status        ENUM('JOINED', 'CANCELED') NOT NULL DEFAULT 'JOINED',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_participations_gb_user (group_buy_id, user_id),
  KEY idx_participations_user (user_id),
  CONSTRAINT fk_participations_group_buy FOREIGN KEY (group_buy_id) REFERENCES group_buys (id),
  CONSTRAINT fk_participations_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT chk_participations_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- mock 결제용 주문
CREATE TABLE orders (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  participation_id  INT UNSIGNED NOT NULL,
  amount            INT UNSIGNED NOT NULL,
  status            ENUM('PENDING', 'PAID', 'CANCELED') NOT NULL DEFAULT 'PENDING',
  paid_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_orders_participation (participation_id),
  CONSTRAINT fk_orders_participation FOREIGN KEY (participation_id) REFERENCES participations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
