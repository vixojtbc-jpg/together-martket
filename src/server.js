require('dotenv').config();

const app = require('./app');
const db = require('./config/db');
const { startCloseScheduler } = require('./services/closeScheduler');

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`공구마켓 서버 실행 중: http://localhost:${PORT}`);
});

const scheduler = startCloseScheduler();

// PM2 reload / Ctrl+C 시 진행 중인 요청을 마치고 종료
function shutdown(signal) {
  console.log(`${signal} 수신: 서버를 종료합니다.`);
  scheduler.stop();
  server.close(async () => {
    await db.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
