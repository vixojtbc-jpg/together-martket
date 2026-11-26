// 관리자 기능. 공구 상태 변경(강제 취소)은 groupBuyService 를 통해서만 한다.
const userRepository = require('../repositories/userRepository');
const groupBuyRepository = require('../repositories/groupBuyRepository');
const orderRepository = require('../repositories/orderRepository');
const groupBuyService = require('./groupBuyService');
const AppError = require('../utils/AppError');
const { GROUP_BUY_STATUS, ORDER_STATUS, ROLE } = require('../utils/labels');
const { formatPrice, formatKST } = require('../utils/format');

const ROLES = Object.keys(ROLE);
const GB_STATUSES = Object.keys(GROUP_BUY_STATUS);

function countMap(rows, keys) {
  const map = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const row of rows) map[row.status || row.role] = Number(row.count);
  return map;
}

async function getDashboard() {
  const [roleRows, statusRows, orderRows] = await Promise.all([
    userRepository.countByRole(),
    groupBuyRepository.countByStatus(),
    orderRepository.statsByStatus(),
  ]);
  const roles = countMap(roleRows, ROLES);
  const statuses = countMap(statusRows, GB_STATUSES);
  const orders = Object.keys(ORDER_STATUS).map((status) => {
    const row = orderRows.find((r) => r.status === status);
    return { status, label: ORDER_STATUS[status], count: row ? Number(row.count) : 0, totalText: formatPrice(row ? Number(row.total) : 0) };
  });

  return {
    userTotal: Object.values(roles).reduce((a, b) => a + b, 0),
    roles: ROLES.map((r) => ({ label: ROLE[r], count: roles[r] })),
    groupBuyTotal: Object.values(statuses).reduce((a, b) => a + b, 0),
    statuses: GB_STATUSES.map((s) => ({ status: s, label: GROUP_BUY_STATUS[s], count: statuses[s] })),
    orders,
  };
}

async function listUsers() {
  const rows = await userRepository.findAllForAdmin();
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    role: u.role,
    roleText: ROLE[u.role],
    hostedCount: Number(u.hosted_count),
    joinedCount: Number(u.joined_count),
    createdAtText: formatKST(u.created_at),
  }));
}

async function changeRole(admin, userId, role) {
  if (!ROLES.includes(role)) throw new AppError(400, '올바르지 않은 역할이에요.');
  if (admin.id === userId) throw new AppError(409, '내 계정의 역할은 바꿀 수 없어요.');

  const target = await userRepository.findById(userId);
  if (!target) throw new AppError(404, '회원을 찾을 수 없어요.');
  if (target.role === role) return target;

  if (target.role === 'HOST' && (await groupBuyRepository.hasOpenByHost(userId))) {
    throw new AppError(409, '진행 중인 공구가 있는 공구장은 역할을 바꿀 수 없어요.');
  }
  await userRepository.updateRole(userId, role);
  return { ...target, role };
}

async function listGroupBuys(status) {
  const filter = GB_STATUSES.includes(status) ? status : null;
  const now = new Date();
  const rows = await groupBuyRepository.findAllForAdmin(filter);
  return {
    filter,
    filters: GB_STATUSES.map((s) => ({ value: s, label: GROUP_BUY_STATUS[s] })),
    groupBuys: rows.map((gb) => ({
      id: gb.id,
      title: gb.title,
      hostNickname: gb.host_nickname,
      salePriceText: formatPrice(gb.sale_price),
      currentQuantity: gb.current_quantity,
      targetQuantity: gb.target_quantity,
      status: gb.status,
      statusText: GROUP_BUY_STATUS[gb.status],
      deadlineText: formatKST(gb.deadline_at),
      canCancel: groupBuyService.isOpen(gb, now),
    })),
  };
}

async function cancelGroupBuy(admin, id) {
  return groupBuyService.cancelGroupBuy(admin, id);
}

module.exports = { ROLES, getDashboard, listUsers, changeRole, listGroupBuys, cancelGroupBuy };
