const orderService = require('../services/orderService');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');

function requireId(req) {
  const id = parseId(req.params.id);
  if (!id) throw new AppError(404, '주문을 찾을 수 없어요.');
  return id;
}

// GET /orders — 주문 내역
async function index(req, res) {
  const page = await orderService.listMine(req.user);
  res.render('pages/orders/index', { title: '주문 내역 - 공구마켓', ...page });
}

// GET /orders/:id/pay — 모의 결제 확인 화면
async function payForm(req, res) {
  const id = requireId(req);
  const order = await orderService.getMine(req.user, id);
  if (!order.isPending) {
    req.flash('info', '이미 결제가 끝난 주문이에요.');
    return res.redirect('/orders');
  }
  return res.render('pages/orders/pay', { title: '결제하기 - 공구마켓', order });
}

// POST /orders/:id/pay — 모의 결제 실행
async function pay(req, res) {
  const id = requireId(req);
  try {
    const { amountText } = await orderService.payMock(req.user, id);
    req.flash('success', `${amountText} 결제가 완료되었어요. (모의 결제)`);
  } catch (err) {
    if (!(err instanceof AppError) || err.status !== 409) throw err;
    req.flash('error', err.message);
  }
  res.redirect('/orders');
}

module.exports = { index, payForm, pay };
