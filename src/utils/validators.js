// 입력값 파싱/검증 도우미

// "12" -> 12, 그 외(음수, 소수, 문자, 너무 큰 값) -> null
function parseId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= 4294967295 ? id : null;
}

// 정수 문자열 → 숫자. 범위를 벗어나거나 정수가 아니면 null
function parseIntInRange(value, min, max) {
  const text = typeof value === 'string' ? value.trim().replace(/,/g, '') : '';
  if (!/^-?\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value) {
  return value.length <= 255 && EMAIL_RE.test(value);
}

module.exports = { parseId, parseIntInRange, trimString, isEmail };
