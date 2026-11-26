const authService = require('../services/authService');
const { trimString, isEmail } = require('../utils/validators');
const sessionUtil = require('../utils/session');

// 로그인 처리 공통: 세션 고정 공격 방지를 위해 세션 ID를 새로 발급한다.
async function startSession(req, userId) {
  const returnTo = sessionUtil.safeReturnTo(req.session.returnTo);
  await sessionUtil.regenerate(req);
  req.session.userId = userId;
  await sessionUtil.save(req);
  return returnTo;
}

// GET /signup
function showSignup(req, res) {
  if (req.user) return res.redirect('/');
  res.render('pages/auth/signup', { title: '회원가입 - 공구마켓', values: { role: 'USER' }, errors: {} });
}

// POST /signup
async function signup(req, res) {
  const values = {
    email: trimString(req.body.email).toLowerCase(),
    nickname: trimString(req.body.nickname),
    role: req.body.role === 'HOST' ? 'HOST' : 'USER',
  };
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const passwordConfirm = typeof req.body.passwordConfirm === 'string' ? req.body.passwordConfirm : '';

  const errors = {};
  if (!isEmail(values.email)) errors.email = '올바른 이메일 주소를 입력해 주세요.';
  if (values.nickname.length < 2 || values.nickname.length > 20) {
    errors.nickname = '닉네임은 2~20자로 입력해 주세요.';
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    errors.password = '비밀번호는 8자 이상(최대 72바이트)으로 입력해 주세요.';
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = '비밀번호에 영문과 숫자를 모두 넣어 주세요.';
  }
  if (password !== passwordConfirm) errors.passwordConfirm = '비밀번호가 서로 달라요.';

  if (Object.keys(errors).length === 0) {
    const result = await authService.signup({ ...values, password });
    if (result.errors) {
      Object.assign(errors, result.errors);
    } else {
      await startSession(req, result.userId);
      req.flash('success', `${values.nickname}님, 공구마켓에 오신 것을 환영해요!`);
      return res.redirect('/');
    }
  }

  return res.status(400).render('pages/auth/signup', { title: '회원가입 - 공구마켓', values, errors });
}

// GET /login  (?next=/group-buys/1 이면 로그인 후 그 페이지로)
function showLogin(req, res) {
  if (req.user) return res.redirect('/');
  if (typeof req.query.next === 'string') {
    req.session.returnTo = sessionUtil.safeReturnTo(req.query.next);
  }
  res.render('pages/auth/login', { title: '로그인 - 공구마켓', values: {}, error: null });
}

// POST /login
async function login(req, res) {
  const email = trimString(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const user =
    isEmail(email) && password && Buffer.byteLength(password, 'utf8') <= 72
      ? await authService.authenticate(email, password)
      : null;

  if (!user) {
    return res.status(401).render('pages/auth/login', {
      title: '로그인 - 공구마켓',
      values: { email },
      error: '이메일 또는 비밀번호가 올바르지 않아요.',
    });
  }

  const returnTo = await startSession(req, user.id);
  req.flash('success', `${user.nickname}님, 반가워요!`);
  await sessionUtil.save(req);
  return res.redirect(returnTo);
}

// POST /logout
async function logout(req, res) {
  await sessionUtil.destroy(req);
  res.clearCookie('gonggu.sid');
  res.redirect('/');
}

module.exports = { showSignup, signup, showLogin, login, logout };
