const db = require('../config/db');

// 트랜잭션 안에서 fn(conn) 실행. 에러가 나면 롤백한다.
// fn 안의 쿼리는 반드시 전달받은 conn 으로 실행해야 같은 트랜잭션에 묶인다.
async function withTransaction(fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };
