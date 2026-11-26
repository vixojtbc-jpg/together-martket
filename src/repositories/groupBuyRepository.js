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

module.exports = { OPEN_STATUSES, findOpenList, findDetailById };
