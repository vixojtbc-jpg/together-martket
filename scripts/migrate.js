// db/migrations/*.sql 을 번호 순서대로 실행한다.
// 이미 실행한 파일은 schema_migrations 테이블에 기록되어 건너뛴다.
const fs = require('node:fs/promises');
const path = require('node:path');
const { connect } = require('./db-connect');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const FILE_PATTERN = /^\d{3}_[\w-]+\.sql$/;

async function main() {
  const conn = await connect();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    VARCHAR(255) NOT NULL,
        applied_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (filename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await conn.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.filename));

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((name) => FILE_PATTERN.test(name))
      .sort();

    const pending = files.filter((name) => !applied.has(name));
    if (pending.length === 0) {
      console.log('적용할 마이그레이션이 없습니다. (최신 상태)');
      return;
    }

    for (const name of pending) {
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, name), 'utf8');
      console.log(`▶ ${name} 실행 중...`);
      // MySQL의 DDL은 자동 커밋되므로 파일 단위 트랜잭션은 보장되지 않는다.
      // 중간에 실패하면 에러를 보고 DB를 직접 정리한 뒤 다시 실행해야 한다.
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [name]);
      console.log(`✔ ${name} 완료`);
    }
    console.log(`마이그레이션 ${pending.length}개 적용 완료`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('마이그레이션 실패:', err.message);
  process.exit(1);
});
