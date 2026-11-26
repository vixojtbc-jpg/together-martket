const db = require('../config/db');

// 상세 화면용: 내 참여 내역 (잠금 없음)
async function findByGroupBuyAndUser(groupBuyId, userId) {
  const [rows] = await db.query(
    'SELECT id, quantity, status FROM participations WHERE group_buy_id = ? AND user_id = ?',
    [groupBuyId, userId],
  );
  return rows[0] || null;
}

// 트랜잭션 안에서 내 참여 행을 잠그고 조회
async function findForUpdate(conn, groupBuyId, userId) {
  const [rows] = await conn.query(
    'SELECT id, quantity, status FROM participations WHERE group_buy_id = ? AND user_id = ? FOR UPDATE',
    [groupBuyId, userId],
  );
  return rows[0] || null;
}

async function insert(conn, groupBuyId, userId, quantity) {
  const [result] = await conn.query(
    "INSERT INTO participations (group_buy_id, user_id, quantity, status) VALUES (?, ?, ?, 'JOINED')",
    [groupBuyId, userId, quantity],
  );
  return result.insertId;
}

async function updateQuantityAndStatus(conn, id, quantity, status) {
  await conn.query('UPDATE participations SET quantity = ?, status = ? WHERE id = ?', [
    quantity,
    status,
    id,
  ]);
}

// 공구 취소/실패 시 참여 전부 취소
async function cancelAllJoined(conn, groupBuyId) {
  const [result] = await conn.query(
    "UPDATE participations SET status = 'CANCELED' WHERE group_buy_id = ? AND status = 'JOINED'",
    [groupBuyId],
  );
  return result.affectedRows;
}

// 마이페이지: 내가 참여한 공구 (최근 참여 순)
async function findByUserWithGroupBuy(userId) {
  const [rows] = await db.query(
    `SELECT p.id, p.quantity, p.status, p.created_at,
            gb.id AS group_buy_id, gb.title, gb.image_path, gb.sale_price,
            gb.status AS group_buy_status, gb.deadline_at,
            o.id AS order_id, o.status AS order_status
       FROM participations p
       JOIN group_buys gb ON gb.id = p.group_buy_id
       LEFT JOIN orders o ON o.participation_id = p.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC, p.id DESC`,
    [userId],
  );
  return rows;
}

module.exports = {
  findByUserWithGroupBuy,
  findByGroupBuyAndUser,
  findForUpdate,
  insert,
  updateQuantityAndStatus,
  cancelAllJoined,
};
