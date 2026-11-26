const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');
const db = require('./db');

const MySQLStore = MySQLStoreFactory(session);
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

if (!process.env.SESSION_SECRET) {
  throw new Error('.env 에 SESSION_SECRET 이 필요합니다.');
}

// 세션은 MySQL sessions 테이블에 저장한다 (없으면 자동 생성)
const store = new MySQLStore(
  {
    createDatabaseTable: true,
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: SEVEN_DAYS,
  },
  db,
);

const sessionMiddleware = session({
  name: 'gonggu.sid',
  secret: process.env.SESSION_SECRET,
  store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SEVEN_DAYS,
  },
});

module.exports = { sessionMiddleware };
