// 상태값 → 화면 표시 문구

const GROUP_BUY_STATUS = {
  RECRUITING: '모집 중',
  SUCCEEDED: '목표 달성',
  CLOSED: '마감 (공구 성공)',
  FAILED: '마감 (공구 실패)',
  CANCELED: '취소된 공구',
};

const PARTICIPATION_STATUS = {
  JOINED: '참여 중',
  CANCELED: '참여 취소',
};

const ORDER_STATUS = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  CANCELED: '주문 취소',
};

const ROLE = {
  USER: '일반 회원',
  HOST: '공구장',
  ADMIN: '관리자',
};

module.exports = { GROUP_BUY_STATUS, PARTICIPATION_STATUS, ORDER_STATUS, ROLE };
