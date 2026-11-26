// 마이그레이션/시드 스크립트 전용 연결.
// .sql 파일을 통째로 실행해야 해서 multipleStatements를 켠다.
// (앱의 커넥션 풀 src/config/db.js 에서는 절대 켜지 않는다.)
require('dotenv').config();
const mysql = require('mysql2/promise');

const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_NAME'];

async function connect() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`.env 에 다음 값이 필요합니다: ${missing.join(', ')}`);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    multipleStatements: true,
  });
  await conn.query("SET time_zone = '+00:00'");
  return conn;
}

module.exports = { connect };
