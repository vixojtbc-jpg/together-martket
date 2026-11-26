const db = require('../config/db');

const PUBLIC_COLUMNS = 'id, email, nickname, role, created_at';

async function findById(id) {
  const [rows] = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
  return rows[0] || null;
}

// 로그인 확인용 (password_hash 포함)
async function findByEmailWithHash(email) {
  const [rows] = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = ?`,
    [email],
  );
  return rows[0] || null;
}

async function existsByEmail(email) {
  const [rows] = await db.query('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length > 0;
}

async function existsByNickname(nickname) {
  const [rows] = await db.query('SELECT 1 FROM users WHERE nickname = ? LIMIT 1', [nickname]);
  return rows.length > 0;
}

async function create({ email, passwordHash, nickname, role }) {
  const [result] = await db.query(
    'INSERT INTO users (email, password_hash, nickname, role) VALUES (?, ?, ?, ?)',
    [email, passwordHash, nickname, role],
  );
  return result.insertId;
}

// 관리자: 회원 목록 (최근 가입 순)
async function findAllForAdmin(limit = 200) {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.nickname, u.role, u.created_at,
            (SELECT COUNT(*) FROM group_buys gb WHERE gb.host_id = u.id) AS hosted_count,
            (SELECT COUNT(*) FROM participations p WHERE p.user_id = u.id AND p.status = 'JOINED') AS joined_count
       FROM users u
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ?`,
    [limit],
  );
  return rows;
}

async function countByRole() {
  const [rows] = await db.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
  return rows;
}

async function updateRole(id, role) {
  await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
}

module.exports = {
  findById,
  findByEmailWithHash,
  existsByEmail,
  existsByNickname,
  create,
  findAllForAdmin,
  countByRole,
  updateRole,
};
