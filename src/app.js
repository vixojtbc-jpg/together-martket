const path = require('node:path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const methodOverride = require('method-override');

const indexRouter = require('./routes/index');
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
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(ROOT, 'public')));

// 모든 뷰에서 쓰는 기본값
app.use((req, res, next) => {
  res.locals.title = '공구마켓';
  next();
});

// 라우터
app.use('/', indexRouter);

// 404 / 에러 처리 (항상 마지막)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
