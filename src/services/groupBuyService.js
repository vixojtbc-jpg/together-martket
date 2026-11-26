// 공구 비즈니스 로직. 공구 상태 변경은 이 파일에서만 한다.
const groupBuyRepository = require('../repositories/groupBuyRepository');
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

async function getDetail(id, now = new Date()) {
  const row = await groupBuyRepository.findDetailById(id);
  if (!row) throw new AppError(404, '공구를 찾을 수 없어요.');

  const remainingCapacity =
    row.max_quantity === null ? null : Math.max(row.max_quantity - row.current_quantity, 0);

  return {
    ...toCard(row, now),
    description: row.description,
    hostId: row.host_id,
    hostNickname: row.host_nickname,
    participantCount: Number(row.participant_count),
    maxQuantity: row.max_quantity,
    remainingCapacity,
    isSoldOut: remainingCapacity === 0,
    remainingToTarget: Math.max(row.target_quantity - row.current_quantity, 0),
  };
}

module.exports = { getOpenGroupBuys, getDetail, isOpen, calcDiscountRate, calcProgress };
