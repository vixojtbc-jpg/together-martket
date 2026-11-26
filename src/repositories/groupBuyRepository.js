const db = require('../config/db');

const OPEN_STATUSES = ['RECRUITING', 'SUCCEEDED'];

// 목록 화면: 모집 중이거나 목표를 달성했지만 아직 마감 전인 공구 (마감 임박 순)
async function findOpenList() {
  const [rows] = await db.query(
    `SELECT id, title, image_path, original_price, sale_price,
            target_quantity, max_quantity, current_quantity, deadline_at, status
       FROM group_buys
      WHERE status IN (?)
        AND deadline_at > UTC_TIMESTAMP()
      ORDER BY deadline_at ASC, id ASC`,
    [OPEN_STATUSES],
  );
  return rows;
}

// 상세 화면: 공구 + 공구장 닉네임 + 참여자 수
async function findDetailById(id) {
  const [rows] = await db.query(
    `SELECT gb.*, u.nickname AS host_nickname,
            (SELECT COUNT(*) FROM participations p
              WHERE p.group_buy_id = gb.id AND p.status = 'JOINED') AS participant_count
       FROM group_buys gb
       JOIN users u ON u.id = gb.host_id
      WHERE gb.id = ?`,
    [id],
  );
  return rows[0] || null;
}

// 트랜잭션 안에서 공구 행을 잠그고 조회 (참여/취소/상태 변경 시)
async function findByIdForUpdate(conn, id) {
  const [rows] = await conn.query('SELECT * FROM group_buys WHERE id = ? FOR UPDATE', [id]);
  return rows[0] || null;
}

async function updateQuantityAndStatus(conn, id, currentQuantity, status) {
  await conn.query('UPDATE group_buys SET current_quantity = ?, status = ? WHERE id = ?', [
    currentQuantity,
    status,
    id,
  ]);
}

// 마이페이지: 내가 연 공구 (최근 등록 순) + 참여 인원
async function findByHost(hostId) {
  const [rows] = await db.query(
    `SELECT gb.id, gb.title, gb.image_path, gb.original_price, gb.sale_price,
            gb.target_quantity, gb.max_quantity, gb.current_quantity, gb.deadline_at, gb.status,
            (SELECT COUNT(*) FROM participations p
              WHERE p.group_buy_id = gb.id AND p.status = 'JOINED') AS participant_count
       FROM group_buys gb
      WHERE gb.host_id = ?
      ORDER BY gb.created_at DESC, gb.id DESC`,
    [hostId],
  );
  return rows;
}

// 자동 마감 대상: 마감 시각이 지났는데 아직 모집 중/목표 달성 상태인 공구
async function findExpiredOpenIds(limit = 100) {
  const [rows] = await db.query(
    `SELECT id FROM group_buys
      WHERE status IN (?) AND deadline_at <= UTC_TIMESTAMP()
      ORDER BY deadline_at ASC
      LIMIT ?`,
    [OPEN_STATUSES, limit],
  );
  return rows.map((row) => row.id);
}

// 관리자: 공구 목록 (상태 필터 선택)
async function findAllForAdmin(status = null, limit = 200) {
  const where = status ? 'WHERE gb.status = ?' : '';
  const params = status ? [status, limit] : [limit];
  const [rows] = await db.query(
    `SELECT gb.id, gb.title, gb.sale_price, gb.target_quantity, gb.current_quantity,
            gb.deadline_at, gb.status, gb.created_at, u.nickname AS host_nickname
       FROM group_buys gb
       JOIN users u ON u.id = gb.host_id
       ${where}
      ORDER BY gb.created_at DESC, gb.id DESC
      LIMIT ?`,
    params,
  );
  return rows;
}

async function countByStatus() {
  const [rows] = await db.query('SELECT status, COUNT(*) AS count FROM group_buys GROUP BY status');
  return rows;
}

// 진행 중(마감 전) 공구가 있는 공구장인지
async function hasOpenByHost(hostId) {
  const [rows] = await db.query(
    'SELECT 1 FROM group_buys WHERE host_id = ? AND status IN (?) AND deadline_at > UTC_TIMESTAMP() LIMIT 1',
    [hostId, OPEN_STATUSES],
  );
  return rows.length > 0;
}

async function findById(id) {
  const [rows] = await db.query('SELECT * FROM group_buys WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.query(
    `INSERT INTO group_buys
       (host_id, title, description, image_path, original_price, sale_price,
        target_quantity, max_quantity, deadline_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECRUITING')`,
    [
      data.hostId,
      data.title,
      data.description,
      data.imagePath,
      data.originalPrice,
      data.salePrice,
      data.targetQuantity,
      data.maxQuantity,
      data.deadlineAt,
    ],
  );
  return result.insertId;
}

async function update(conn, id, data) {
  await conn.query(
    `UPDATE group_buys
        SET title = ?, description = ?, image_path = ?, original_price = ?, sale_price = ?,
            target_quantity = ?, max_quantity = ?, deadline_at = ?, status = ?
      WHERE id = ?`,
    [
      data.title,
      data.description,
      data.imagePath,
      data.originalPrice,
      data.salePrice,
      data.targetQuantity,
      data.maxQuantity,
      data.deadlineAt,
      data.status,
      id,
    ],
  );
}

async function updateStatus(conn, id, status) {
  await conn.query('UPDATE group_buys SET status = ? WHERE id = ?', [status, id]);
}

module.exports = {
  OPEN_STATUSES,
  findOpenList,
  findDetailById,
  findByHost,
  findExpiredOpenIds,
  findAllForAdmin,
  countByStatus,
  hasOpenByHost,
  findById,
  findByIdForUpdate,
  create,
  update,
  updateStatus,
  updateQuantityAndStatus,
};
