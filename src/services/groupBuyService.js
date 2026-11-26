// 공구 비즈니스 로직. 공구 상태 변경은 이 파일에서만 한다.
const groupBuyRepository = require('../repositories/groupBuyRepository');
const participationRepository = require('../repositories/participationRepository');
const { withTransaction } = require('../repositories/transaction');
const AppError = require('../utils/AppError');
const { GROUP_BUY_STATUS } = require('../utils/labels');
const { DAY, formatPrice, formatKST, formatRemaining } = require('../utils/format');

// 할인율(%) — 정수 계산, 소수점 버림
function calcDiscountRate(originalPrice, salePrice) {
  if (originalPrice <= 0 || salePrice >= originalPrice) return 0;
  return Math.floor(((originalPrice - salePrice) * 100) / originalPrice);
}

// 진행률(%) — 표시는 실제 값(100% 초과 가능), 막대 너비는 100%까지
function calcProgress(currentQuantity, targetQuantity) {
  if (targetQuantity <= 0) return 0;
  return Math.floor((currentQuantity * 100) / targetQuantity);
}

// 지금 참여/취소가 가능한 상태인지 (상태 + 마감 전)
function isOpen(row, now = new Date()) {
  return (
    groupBuyRepository.OPEN_STATUSES.includes(row.status) &&
    row.deadline_at.getTime() > now.getTime()
  );
}

// DB 행 -> 공구 카드에 필요한 값
function toCard(row, now) {
  const deadline = row.deadline_at;
  const timeLeft = deadline.getTime() - now.getTime();
  const progress = calcProgress(row.current_quantity, row.target_quantity);
  const open = isOpen(row, now);

  return {
    id: row.id,
    title: row.title,
    imagePath: row.image_path,
    originalPriceText: formatPrice(row.original_price),
    salePriceText: formatPrice(row.sale_price),
    discountRate: calcDiscountRate(row.original_price, row.sale_price),
    currentQuantity: row.current_quantity,
    targetQuantity: row.target_quantity,
    progress,
    progressBarWidth: Math.min(progress, 100),
    status: row.status,
    statusText: GROUP_BUY_STATUS[row.status],
    isOpen: open,
    isSucceeded: row.status === 'SUCCEEDED',
    isClosingSoon: open && timeLeft <= DAY,
    remainingText: open ? formatRemaining(deadline, now) : '마감',
    deadlineText: formatKST(deadline),
  };
}

async function getOpenGroupBuys(now = new Date()) {
  const rows = await groupBuyRepository.findOpenList();
  return rows.map((row) => toCard(row, now));
}

// 1인당 한 공구에 참여할 수 있는 최대 수량
const PER_USER_MAX = 100;

// 수량에 따라 RECRUITING <-> SUCCEEDED 결정 (마감 전 상태에서만 사용)
function statusByQuantity(currentQuantity, targetQuantity) {
  return currentQuantity >= targetQuantity ? 'SUCCEEDED' : 'RECRUITING';
}

async function getDetail(id, user = null, now = new Date()) {
  const row = await groupBuyRepository.findDetailById(id);
  if (!row) throw new AppError(404, '공구를 찾을 수 없어요.');

  const remainingCapacity =
    row.max_quantity === null ? null : Math.max(row.max_quantity - row.current_quantity, 0);

  let myQuantity = 0;
  if (user) {
    const mine = await participationRepository.findByGroupBuyAndUser(id, user.id);
    if (mine && mine.status === 'JOINED') myQuantity = mine.quantity;
  }
  const isHost = Boolean(user) && user.id === row.host_id;
  const canManage = isHost && user.role === 'HOST';

  // 이번에 더 참여할 수 있는 최대 수량
  const joinableMax = Math.min(
    PER_USER_MAX - myQuantity,
    remainingCapacity === null ? PER_USER_MAX : remainingCapacity,
  );

  return {
    ...toCard(row, now),
    description: row.description,
    salePrice: row.sale_price,
    hostId: row.host_id,
    hostNickname: row.host_nickname,
    participantCount: Number(row.participant_count),
    maxQuantity: row.max_quantity,
    remainingCapacity,
    isSoldOut: remainingCapacity === 0,
    remainingToTarget: Math.max(row.target_quantity - row.current_quantity, 0),
    isHost,
    canManage,
    canCancelAsAdmin: Boolean(user) && user.role === 'ADMIN',
    myQuantity,
    myTotalText: formatPrice(row.sale_price * myQuantity),
    joinableMax: Math.max(joinableMax, 0),
    perUserMax: PER_USER_MAX,
  };
}

// 공구 참여 (이미 참여했으면 수량 추가). 트랜잭션 + 공구 행 잠금으로 초과 참여를 막는다.
async function join(userId, groupBuyId, quantity, now = new Date()) {
  return withTransaction(async (conn) => {
    const gb = await groupBuyRepository.findByIdForUpdate(conn, groupBuyId);
    if (!gb) throw new AppError(404, '공구를 찾을 수 없어요.');
    if (!isOpen(gb, now)) throw new AppError(409, '참여 기간이 끝났거나 참여할 수 없는 공구예요.');
    if (gb.host_id === userId) throw new AppError(403, '내가 연 공구에는 참여할 수 없어요.');

    if (gb.max_quantity !== null && gb.current_quantity + quantity > gb.max_quantity) {
      const left = Math.max(gb.max_quantity - gb.current_quantity, 0);
      throw new AppError(
        409,
        left === 0 ? '모든 수량이 마감되었어요.' : `남은 수량은 ${left}개예요. 수량을 줄여 주세요.`,
      );
    }

    const mine = await participationRepository.findForUpdate(conn, groupBuyId, userId);
    const before = mine && mine.status === 'JOINED' ? mine.quantity : 0;
    const after = before + quantity;
    if (after > PER_USER_MAX) {
      throw new AppError(409, `1인당 최대 ${PER_USER_MAX}개까지 참여할 수 있어요. (현재 ${before}개 참여 중)`);
    }

    if (mine) {
      // 수량 추가 또는 취소했던 참여를 다시 활성화
      await participationRepository.updateQuantityAndStatus(conn, mine.id, after, 'JOINED');
    } else {
      await participationRepository.insert(conn, groupBuyId, userId, quantity);
    }

    const newCurrent = gb.current_quantity + quantity;
    const newStatus = statusByQuantity(newCurrent, gb.target_quantity);
    await groupBuyRepository.updateQuantityAndStatus(conn, groupBuyId, newCurrent, newStatus);

    return { added: before > 0, quantity: after, reachedTarget: newStatus === 'SUCCEEDED' && gb.status !== 'SUCCEEDED' };
  });
}

// 참여 취소 (마감 전, RECRUITING/SUCCEEDED 상태에서만)
async function cancelParticipation(userId, groupBuyId, now = new Date()) {
  return withTransaction(async (conn) => {
    const gb = await groupBuyRepository.findByIdForUpdate(conn, groupBuyId);
    if (!gb) throw new AppError(404, '공구를 찾을 수 없어요.');
    if (!isOpen(gb, now)) throw new AppError(409, '마감되었거나 취소할 수 없는 공구예요.');

    const mine = await participationRepository.findForUpdate(conn, groupBuyId, userId);
    if (!mine || mine.status !== 'JOINED') throw new AppError(409, '참여 내역이 없어요.');

    await participationRepository.updateQuantityAndStatus(conn, mine.id, mine.quantity, 'CANCELED');

    const newCurrent = Math.max(gb.current_quantity - mine.quantity, 0);
    const newStatus = statusByQuantity(newCurrent, gb.target_quantity);
    await groupBuyRepository.updateQuantityAndStatus(conn, groupBuyId, newCurrent, newStatus);

    return { quantity: mine.quantity };
  });
}

// ───────── 공구장: 등록 / 수정 / 취소 ─────────

// 수정·취소 권한: 본인 공구의 공구장 (취소는 관리자도 가능)
function assertCanManage(user, gb, { allowAdmin = false } = {}) {
  const isOwner = user.role === 'HOST' && gb.host_id === user.id;
  const isAdmin = allowAdmin && user.role === 'ADMIN';
  if (!isOwner && !isAdmin) throw new AppError(403, '내가 연 공구만 관리할 수 있어요.');
}

// data: 컨트롤러에서 검증을 마친 값 (imagePath 포함)
async function createGroupBuy(hostId, data) {
  return groupBuyRepository.create({ ...data, hostId });
}

// 수정 화면용
async function getForEdit(user, id, now = new Date()) {
  const gb = await groupBuyRepository.findById(id);
  if (!gb) throw new AppError(404, '공구를 찾을 수 없어요.');
  assertCanManage(user, gb);
  if (!isOpen(gb, now)) throw new AppError(409, '마감되었거나 취소된 공구는 수정할 수 없어요.');
  return { ...gb, hasParticipants: gb.current_quantity > 0 };
}

// 공구 수정. 참여자가 있으면 가격은 바꿀 수 없고, 최대 수량은 현재 참여 수량 이상이어야 한다.
// 반환: { oldImagePath } — 이미지가 바뀌었으면 이전 파일 이름 (호출한 쪽에서 삭제)
async function updateGroupBuy(user, id, data, now = new Date()) {
  return withTransaction(async (conn) => {
    const gb = await groupBuyRepository.findByIdForUpdate(conn, id);
    if (!gb) throw new AppError(404, '공구를 찾을 수 없어요.');
    assertCanManage(user, gb);
    if (!isOpen(gb, now)) throw new AppError(409, '마감되었거나 취소된 공구는 수정할 수 없어요.');

    const hasParticipants = gb.current_quantity > 0;
    if (
      hasParticipants &&
      (data.originalPrice !== gb.original_price || data.salePrice !== gb.sale_price)
    ) {
      throw new AppError(409, '참여자가 있는 공구는 가격을 바꿀 수 없어요.');
    }
    if (data.maxQuantity !== null && data.maxQuantity < gb.current_quantity) {
      throw new AppError(409, `최대 수량은 현재 참여 수량(${gb.current_quantity}개) 이상이어야 해요.`);
    }

    await groupBuyRepository.update(conn, id, {
      ...data,
      imagePath: data.imagePath === undefined ? gb.image_path : data.imagePath,
      status: statusByQuantity(gb.current_quantity, data.targetQuantity),
    });

    const imageChanged = data.imagePath !== undefined && data.imagePath !== gb.image_path;
    return { oldImagePath: imageChanged ? gb.image_path : null };
  });
}

// 공구 취소 (공구장 본인 또는 관리자). 참여는 전부 취소된다.
async function cancelGroupBuy(user, id, now = new Date()) {
  return withTransaction(async (conn) => {
    const gb = await groupBuyRepository.findByIdForUpdate(conn, id);
    if (!gb) throw new AppError(404, '공구를 찾을 수 없어요.');
    assertCanManage(user, gb, { allowAdmin: true });
    if (!isOpen(gb, now)) throw new AppError(409, '이미 마감되었거나 취소된 공구예요.');

    await groupBuyRepository.updateStatus(conn, id, 'CANCELED');
    const canceledCount = await participationRepository.cancelAllJoined(conn, id);
    return { canceledCount };
  });
}

module.exports = {
  PER_USER_MAX,
  getOpenGroupBuys,
  getDetail,
  join,
  cancelParticipation,
  createGroupBuy,
  getForEdit,
  updateGroupBuy,
  cancelGroupBuy,
  isOpen,
  calcDiscountRate,
  calcProgress,
};
