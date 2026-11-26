-- seed.sql : 개발용 샘플 데이터 (기존 데이터를 모두 지우고 다시 넣는다)
-- 모든 샘플 계정 비밀번호: password1234  (개발용, 운영 사용 금지)
-- 마감일은 실행 시점(UTC) 기준 상대 시간으로 넣는다.

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE orders;
TRUNCATE TABLE participations;
TRUNCATE TABLE group_buys;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, email, password_hash, nickname, role) VALUES
  (1, 'admin@example.com', '$2b$10$UyZvIsG6gGl23BSrE5k3ue0uWBe23yO8.skaSoydlG0ALzkBY9YDm', '관리자',     'ADMIN'),
  (2, 'host@example.com',  '$2b$10$UyZvIsG6gGl23BSrE5k3ue0uWBe23yO8.skaSoydlG0ALzkBY9YDm', '알뜰공구장', 'HOST'),
  (3, 'user1@example.com', '$2b$10$UyZvIsG6gGl23BSrE5k3ue0uWBe23yO8.skaSoydlG0ALzkBY9YDm', '김참여',     'USER'),
  (4, 'user2@example.com', '$2b$10$UyZvIsG6gGl23BSrE5k3ue0uWBe23yO8.skaSoydlG0ALzkBY9YDm', '이구매',     'USER');

-- current_quantity 는 아래 participations(JOINED) 수량 합과 일치시킨다.
INSERT INTO group_buys
  (id, host_id, title, description, image_path, original_price, sale_price,
   target_quantity, max_quantity, current_quantity, deadline_at, status)
VALUES
  (1, 2, '제주 노지 감귤 10kg',
   '제주 서귀포 농가에서 직송하는 노지 감귤입니다. 새콤달콤한 맛이 일품이에요.',
   NULL, 39000, 24900, 50, 100, 32, UTC_TIMESTAMP() + INTERVAL 3 DAY, 'RECRUITING'),

  (2, 2, '노이즈캔슬링 무선 이어폰',
   '액티브 노이즈캔슬링, 최대 30시간 재생. 1년 무상 A/S 포함.',
   NULL, 89000, 59000, 30, NULL, 30, UTC_TIMESTAMP() + INTERVAL 5 DAY, 'SUCCEEDED'),

  (3, 2, '유기농 현미 20kg',
   '올해 수확한 국내산 유기농 현미입니다. 도정일로부터 7일 이내 발송.',
   NULL, 62000, 45000, 20, 40, 14, UTC_TIMESTAMP() + INTERVAL 10 HOUR, 'RECRUITING'),

  (4, 2, '스페셜티 핸드드립 원두 1kg',
   '에티오피아 예가체프 싱글오리진. 주문 후 로스팅해서 보내드려요.',
   NULL, 32000, 21900, 40, 80, 8, UTC_TIMESTAMP() + INTERVAL 7 DAY, 'RECRUITING'),

  (5, 2, '대용량 액체 세탁세제 4L x 4개',
   '고농축 저자극 세제. 드럼/일반 세탁기 겸용입니다.',
   NULL, 45000, 29900, 60, 120, 58, UTC_TIMESTAMP() + INTERVAL 20 HOUR, 'RECRUITING'),

  (6, 2, '경량 캠핑 릴렉스 체어',
   '1.2kg 초경량 알루미늄 프레임, 최대 하중 120kg. 수납 파우치 포함.',
   NULL, 69000, 42000, 25, 50, 0, UTC_TIMESTAMP() + INTERVAL 14 DAY, 'RECRUITING');

INSERT INTO participations (group_buy_id, user_id, quantity, status) VALUES
  (1, 3, 20, 'JOINED'), (1, 4, 12, 'JOINED'),
  (2, 3, 18, 'JOINED'), (2, 4, 12, 'JOINED'),
  (3, 3, 10, 'JOINED'), (3, 4,  4, 'JOINED'),
  (4, 3,  5, 'JOINED'), (4, 4,  3, 'JOINED'),
  (5, 3, 30, 'JOINED'), (5, 4, 28, 'JOINED');
