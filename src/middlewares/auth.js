const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');

// 세션의 userId로 현재 사용자를 불러와 req.user / res.locals.currentUser 에 넣는다.
// 역할(role)이 바뀌어도 바로 반영되도록 매 요청 DB에서 읽는다.
async function loadCurrentUser(req, res, next) {
  req.user = null;
  if (req.session.userId) {
    const user = await userRepository.findById(req.session.userId);
    if (user) {
      req.user = user;
    } else {
      delete req.session.userId; // 탈퇴/삭제된 계정
    }
  }
  res.locals.currentUser = req.user;
  next();
}

// 로그인 필요. 로그인 안 했으면 로그인 페이지로 (로그인 후 원래 페이지로 복귀)
function requireLogin(req, res, next) {
  if (req.user) return next();
  if (req.method === 'GET') {
    req.session.returnTo = req.originalUrl;
  }
  req.flash('info', '로그인이 필요한 서비스예요.');
  return res.redirect('/login');
}

// 특정 역할만 허용. 예: requireRole('HOST'), requireRole('ADMIN')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return requireLogin(req, res, next);
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, '이 페이지에 접근할 권한이 없어요.'));
    }
    return next();
  };
}

module.exports = { loadCurrentUser, requireLogin, requireRole };
