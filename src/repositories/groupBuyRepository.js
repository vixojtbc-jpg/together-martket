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

module.exports = { findOpenList };
