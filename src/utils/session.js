// express-session 의 콜백 API를 async/await 로 쓰기 위한 래퍼
const { promisify } = require('node:util');

function regenerate(req) {
  return promisify(req.session.regenerate.bind(req.session))();
}

function save(req) {
  return promisify(req.session.save.bind(req.session))();
}

function destroy(req) {
  return promisify(req.session.destroy.bind(req.session))();
}

// 로그인 후 돌아갈 주소: 우리 사이트 내부 경로만 허용 (오픈 리다이렉트 방지)
function safeReturnTo(value) {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}

module.exports = { regenerate, save, destroy, safeReturnTo };
