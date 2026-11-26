const path = require('node:path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const methodOverride = require('method-override');

const { sessionMiddleware } = require('./config/session');
const flash = require('./middlewares/flash');
const { loadCurrentUser } = require('./middlewares/auth');
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const groupBuysRouter = require('./routes/groupBuys');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const ROOT = path.join(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  // Nginx 뒤에서 secure 쿠키가 동작하도록
  app.set('trust proxy', 1);
}

// 뷰
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 모든 뷰에서 쓰는 기본값 (에러 페이지도 레이아웃을 쓰므로 가장 먼저 설정)
app.use((req, res, next) => {
  res.locals.title = '공구마켓';
  res.locals.currentUser = null;
  res.locals.flash = null;
  next();
});

// 공통 미들웨어
// 로컬 http 개발 환경에서는 HTTPS 강제(HSTS, upgrade-insecure-requests)를 끈다.
app.use(
  helmet({
    hsts: isProd,
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: isProd ? [] : null },
    },
  }),
);
app.use(express.static(path.join(ROOT, 'public')));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
// <form method="POST" action="/xxx?_method=DELETE"> 형태로 PUT/DELETE 사용
app.use(methodOverride('_method'));

// 세션 / 로그인 사용자 / 알림 메시지
app.use(sessionMiddleware);
app.use(flash);
app.use(loadCurrentUser);

// 라우터
app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/group-buys', groupBuysRouter);

// 404 / 에러 처리 (항상 마지막)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
