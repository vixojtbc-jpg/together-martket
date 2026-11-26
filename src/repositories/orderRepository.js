const db = require('../config/db');

// 공구가 CLOSED 될 때: 참여 중인 사람마다 결제 대기 주문 생성 (금액 = 공구가 × 수량)
async function createPendingForGroupBuy(conn, groupBuyId, salePrice) {
  const [result] = await conn.query(
    `INSERT INTO orders (participation_id, amount, status)
     SELECT p.id, p.quantity * ?, 'PENDING'
       FROM participations p
      WHERE p.group_buy_id = ? AND p.status = 'JOINED'`,
    [salePrice, groupBuyId],
  );
  return result.affectedRows;
}

const ORDER_COLUMNS = `
  o.id, o.amount, o.status, o.paid_at, o.created_at,
  p.user_id, p.quantity,
  gb.id AS group_buy_id, gb.title, gb.image_path, gb.sale_price`;

const ORDER_JOINS = `
  FROM orders o
  JOIN participations p ON p.id = o.participation_id
  JOIN group_buys gb ON gb.id = p.group_buy_id`;

// 주문 내역 (최근 순)
async function findByUser(userId) {
  const [rows] = await db.query(
    `SELECT ${ORDER_COLUMNS} ${ORDER_JOINS} WHERE p.user_id = ? ORDER BY o.created_at DESC, o.id DESC`,
    [userId],
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(`SELECT ${ORDER_COLUMNS} ${ORDER_JOINS} WHERE o.id = ?`, [id]);
  return rows[0] || null;
}

// 결제 처리용: 주문 행 잠금
async function findByIdForUpdate(conn, id) {
  const [rows] = await conn.query(
    `SELECT ${ORDER_COLUMNS} ${ORDER_JOINS} WHERE o.id = ? FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function markPaid(conn, id) {
  await conn.query("UPDATE orders SET status = 'PAID', paid_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
}

module.exports = { createPendingForGroupBuy, findByUser, findById, findByIdForUpdate, markPaid };
