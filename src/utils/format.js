// 화면 표시용 포맷 함수 모음 (금액, 날짜, 남은 시간)

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const kstDateTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// 12345 -> "12,345원"
function formatPrice(amount) {
  return `${Number(amount).toLocaleString('ko-KR')}원`;
}

// UTC Date -> "12월 3일 (목) 14:00" (한국 시간)
function formatKST(date) {
  return kstDateTime.format(date);
}

// 마감까지 남은 시간 -> "3일 4시간 남음", "5시간 20분 남음", "12분 남음", "마감"
function formatRemaining(deadline, now = new Date()) {
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return '마감';

  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff % DAY) / HOUR);
  const minutes = Math.floor((diff % HOUR) / MINUTE);

  if (days > 0) return hours > 0 ? `${days}일 ${hours}시간 남음` : `${days}일 남음`;
  if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분 남음` : `${hours}시간 남음`;
  if (minutes > 0) return `${minutes}분 남음`;
  return '곧 마감';
}

module.exports = { MINUTE, HOUR, DAY, formatPrice, formatKST, formatRemaining };
