const groupBuyService = require('../services/groupBuyService');
const AppError = require('../utils/AppError');
const { parseId, parseIntInRange } = require('../utils/validators');

function requireId(req) {
  const id = parseId(req.params.id);
  if (!id) throw new AppError(404, '공구를 찾을 수 없어요.');
  return id;
}

// 사용자에게 보여줄 수 있는 에러(4xx)는 알림으로 띄우고 상세 페이지로 돌려보낸다.
async function runAndRedirect(req, res, id, action) {
  try {
    const message = await action();
    req.flash('success', message);
  } catch (err) {
    if (!(err instanceof AppError) || err.status >= 500 || err.status === 404) throw err;
    req.flash('error', err.message);
  }
  res.redirect(`/group-buys/${id}`);
}

// GET /group-buys/:id
async function show(req, res) {
  const id = requireId(req);
  const gb = await groupBuyService.getDetail(id, req.user);
  res.render('pages/group-buys/show', { title: `${gb.title} - 공구마켓`, gb });
}

// POST /group-buys/:id/participations — 참여 / 수량 추가
async function join(req, res) {
  const id = requireId(req);
  const quantity = parseIntInRange(req.body.quantity, 1, groupBuyService.PER_USER_MAX);

  await runAndRedirect(req, res, id, async () => {
    if (quantity === null) {
      throw new AppError(400, `수량은 1~${groupBuyService.PER_USER_MAX}개 사이로 입력해 주세요.`);
    }
    const result = await groupBuyService.join(req.user.id, id, quantity);
    let message = result.added
      ? `${quantity}개를 추가했어요. 지금 총 ${result.quantity}개 참여 중이에요.`
      : `공구에 참여했어요! (${quantity}개)`;
    if (result.reachedTarget) message += ' 🎉 목표 수량을 달성했어요!';
    return message;
  });
}

// DELETE /group-buys/:id/participations — 참여 취소
async function cancelParticipation(req, res) {
  const id = requireId(req);
  await runAndRedirect(req, res, id, async () => {
    const result = await groupBuyService.cancelParticipation(req.user.id, id);
    return `참여를 취소했어요. (${result.quantity}개)`;
  });
}

module.exports = { show, join, cancelParticipation };
