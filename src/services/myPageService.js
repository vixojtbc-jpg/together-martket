// 마이페이지 화면 데이터 (조회 전용)
const participationRepository = require('../repositories/participationRepository');
const groupBuyRepository = require('../repositories/groupBuyRepository');
const groupBuyService = require('./groupBuyService');
const { GROUP_BUY_STATUS, PARTICIPATION_STATUS, ORDER_STATUS, ROLE } = require('../utils/labels');
const { formatPrice, formatKST } = require('../utils/format');

async function getMyPage(user, now = new Date()) {
  const participations = (await participationRepository.findByUserWithGroupBuy(user.id)).map((p) => {
    const gbOpen = groupBuyService.isOpen({ status: p.group_buy_status, deadline_at: p.deadline_at }, now);
    return {
      groupBuyId: p.group_buy_id,
      title: p.title,
      imagePath: p.image_path,
      quantity: p.quantity,
      amountText: formatPrice(p.sale_price * p.quantity),
      status: p.status,
      statusText: PARTICIPATION_STATUS[p.status],
      groupBuyStatus: p.group_buy_status,
      groupBuyStatusText: gbOpen || !['RECRUITING', 'SUCCEEDED'].includes(p.group_buy_status)
        ? GROUP_BUY_STATUS[p.group_buy_status]
        : '마감 처리 중',
      deadlineText: formatKST(p.deadline_at),
      joinedAtText: formatKST(p.created_at),
      canCancel: p.status === 'JOINED' && gbOpen,
      orderId: p.order_id,
      orderStatus: p.order_status,
      orderStatusText: p.order_status ? ORDER_STATUS[p.order_status] : null,
    };
  });

  const hosted =
    user.role === 'HOST'
      ? (await groupBuyRepository.findByHost(user.id)).map((row) => ({
          id: row.id,
          title: row.title,
          imagePath: row.image_path,
          salePriceText: formatPrice(row.sale_price),
          currentQuantity: row.current_quantity,
          targetQuantity: row.target_quantity,
          progress: groupBuyService.calcProgress(row.current_quantity, row.target_quantity),
          participantCount: Number(row.participant_count),
          status: row.status,
          statusText: GROUP_BUY_STATUS[row.status],
          deadlineText: formatKST(row.deadline_at),
          canEdit: groupBuyService.isOpen(row, now),
        }))
      : null;

  return {
    profile: { nickname: user.nickname, email: user.email, roleText: ROLE[user.role], joinedAtText: formatKST(user.created_at) },
    participations,
    activeCount: participations.filter((p) => p.status === 'JOINED').length,
    hosted,
  };
}

module.exports = { getMyPage };
