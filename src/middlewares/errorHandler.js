// 라우터에 걸리지 않은 요청 → 404
function notFound(req, res, next) {
  res.status(404).render('pages/error', {
    title: '페이지를 찾을 수 없어요',
    status: 404,
    message: '요청하신 페이지가 없거나 이동되었어요.',
  });
}

// 공통 에러 핸들러: 사용자에게는 친절한 문구, 서버 로그에는 상세 에러
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const where = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`;
  if (status >= 500) {
    console.error(where, err); // 서버 문제: 스택까지 상세히
  } else {
    console.warn(`${where} ${status} ${err.message}`); // 사용자 요청 문제: 한 줄만
  }

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).render('pages/error', {
    title: '문제가 발생했어요',
    status,
    message:
      status >= 500
        ? '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'
        : err.expose && err.message
          ? err.message
          : '요청을 처리할 수 없어요.',
  });
}

module.exports = { notFound, errorHandler };
