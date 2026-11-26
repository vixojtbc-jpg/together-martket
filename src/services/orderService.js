// 주문 / 모의 결제 (실제 결제·카드 정보는 다루지 않는다)
const orderRepository = require('../repositories/orderRepository');
const { withTransaction } = require('../repositories/transaction');
const AppError = require('../utils/AppError');
const { ORDER_STATUS } = require('../utils/labels');
const { formatPrice, formatKST } = require('../utils/format');

function toView(row) {
  return {
    id: row.id,
    groupBuyId: row.group_buy_id,
    title: row.title,
    imagePath: row.image_path,
    quantity: row.quantity,
    unitPriceText: formatPrice(row.sale_price),
    amountText: formatPrice(row.amount),
    status: row.status,
    statusText: ORDER_STATUS[row.status],
    isPending: row.status === 'PENDING',
    createdAtText: formatKST(row.created_at),
    paidAtText: row.paid_at ? formatKST(row.paid_at) : null,
  };
}

// 다른 사람 주문은 존재 여부도 알려주지 않는다 (404)
function assertOwner(user, row) {
  if (!row || row.user_id !== user.id) throw new AppError(404, '주문을 찾을 수 없어요.');
}

async function listMine(user) {
  const rows = await orderRepository.findByUser(user.id);
  const orders = rows.map(toView);
  const pendingTotal = rows.filter((r) => r.status === 'PENDING').reduce((sum, r) => sum + r.amount, 0);
  return { orders, pendingCount: orders.filter((o) => o.isPending).length, pendingTotalText: formatPrice(pendingTotal) };
}

async function getMine(user, id) {
  const row = await orderRepository.findById(id);
  assertOwner(user, row);
  return toView(row);
}

// 모의 결제: 결제 대기 → 결제 완료
async function payMock(user, id) {
  return withTransaction(async (conn) => {
    const row = await orderRepository.findByIdForUpdate(conn, id);
    assertOwner(user, row);
    if (row.status !== 'PENDING') throw new AppError(409, '이미 결제했거나 결제할 수 없는 주문이에요.');
    await orderRepository.markPaid(conn, id);
    return { amountText: formatPrice(row.amount) };
  });
}

module.exports = { listMine, getMine, payMock };
