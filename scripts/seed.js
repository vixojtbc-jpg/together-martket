// db/seed.sql 을 실행한다. 기존 데이터를 지우므로 개발 환경에서만 허용한다.
const fs = require('node:fs/promises');
const path = require('node:path');
const { connect } = require('./db-connect');

const SEED_FILE = path.join(__dirname, '..', 'db', 'seed.sql');

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('운영 환경(NODE_ENV=production)에서는 시드를 실행할 수 없습니다.');
  }

  const conn = await connect();
  try {
    const sql = await fs.readFile(SEED_FILE, 'utf8');
    await conn.query(sql);
    console.log('시드 데이터 입력 완료');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('시드 실패:', err.message);
  process.exit(1);
});
