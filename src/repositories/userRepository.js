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

module.exports = { findById, findByEmailWithHash, existsByEmail, existsByNickname, create };
