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

module.exports = { findByGroupBuyAndUser, findForUpdate, insert, updateQuantityAndStatus };
