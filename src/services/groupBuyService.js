// 공구 비즈니스 로직. 공구 상태 변경은 이 파일에서만 한다.
const groupBuyRepository = require('../repositories/groupBuyRepository');
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

// DB 행 -> 공구 카드에 필요한 값
function toCard(row, now) {
  const deadline = row.deadline_at;
  const timeLeft = deadline.getTime() - now.getTime();
  const progress = calcProgress(row.current_quantity, row.target_quantity);

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
    isSucceeded: row.status === 'SUCCEEDED',
    isClosingSoon: timeLeft > 0 && timeLeft <= DAY,
    remainingText: formatRemaining(deadline, now),
    deadlineText: formatKST(deadline),
  };
}

async function getOpenGroupBuys(now = new Date()) {
  const rows = await groupBuyRepository.findOpenList();
  return rows.map((row) => toCard(row, now));
}

module.exports = { getOpenGroupBuys, calcDiscountRate, calcProgress };
