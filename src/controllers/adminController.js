const adminService = require('../services/adminService');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');
const { ROLE } = require('../utils/labels');

// 4xx 는 알림으로 보여주고 목록으로 돌아간다
async function runAndRedirect(req, res, to, action) {
  try {
    req.flash('success', await action());
  } catch (err) {
    if (!(err instanceof AppError) || err.status >= 500) throw err;
    req.flash('error', err.message);
  }
  res.redirect(to);
}

// GET /admin
async function dashboard(req, res) {
  const stats = await adminService.getDashboard();
  res.render('pages/admin/index', { title: '관리자 - 공구마켓', tab: 'home', ...stats });
}

// GET /admin/users
async function users(req, res) {
  const list = await adminService.listUsers();
  res.render('pages/admin/users', { title: '회원 관리 - 공구마켓', tab: 'users', users: list, roles: ROLE });
}

// POST /admin/users/:id/role
async function changeRole(req, res) {
  const id = parseId(req.params.id);
  await runAndRedirect(req, res, '/admin/users', async () => {
    if (!id) throw new AppError(404, '회원을 찾을 수 없어요.');
    const user = await adminService.changeRole(req.user, id, String(req.body.role || ''));
    return `${user.nickname}님의 역할을 '${ROLE[user.role]}'(으)로 바꿨어요.`;
  });
}

// GET /admin/group-buys?status=RECRUITING
async function groupBuys(req, res) {
  const data = await adminService.listGroupBuys(typeof req.query.status === 'string' ? req.query.status : null);
  res.render('pages/admin/group-buys', { title: '공구 관리 - 공구마켓', tab: 'group-buys', ...data });
}

// POST /admin/group-buys/:id/cancel?status=RECRUITING  (처리 후 같은 필터 목록으로 복귀)
async function cancelGroupBuy(req, res) {
  const id = parseId(req.params.id);
  const status = typeof req.query.status === 'string' && /^[A-Z]+$/.test(req.query.status) ? req.query.status : '';
  const back = status ? `/admin/group-buys?status=${status}` : '/admin/group-buys';
  await runAndRedirect(req, res, back, async () => {
    if (!id) throw new AppError(404, '공구를 찾을 수 없어요.');
    const { canceledCount } = await adminService.cancelGroupBuy(req.user, id);
    return `공구 #${id}를 취소했어요. 참여 ${canceledCount}건이 함께 취소되었어요.`;
  });
}

module.exports = { dashboard, users, changeRole, groupBuys, cancelGroupBuy };
