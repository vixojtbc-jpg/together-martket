require('dotenv').config();

const app = require('./app');
const db = require('./config/db');
const { startCloseScheduler } = require('./services/closeScheduler');

const PORT = Number(process.env.PORT) || 3000;
// 운영에서는 Nginx 를 통해서만 들어오도록 서버 내부 주소(127.0.0.1)에서만 대기한다.
const HOST = process.env.NODE_ENV === 'production' ? '127.0.0.1' : undefined;

const server = app.listen(PORT, HOST, () => {
  console.log(`공구마켓 서버 실행 중: http://${HOST || 'localhost'}:${PORT}`);
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
