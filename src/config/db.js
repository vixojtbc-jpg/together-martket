const mysql = require('mysql2');

// 앱 전체에서 이 풀 하나만 재사용한다.
const corePool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z', // JS Date <-> DATETIME 변환을 UTC 기준으로
  dateStrings: false,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// CURRENT_TIMESTAMP 등 DB 측 시간 함수도 UTC로 동작하도록 세션 타임존을 맞춘다.
corePool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

module.exports = corePool.promise();
