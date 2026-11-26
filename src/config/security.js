// 운영/HTTPS 여부를 한 곳에서 판단한다.
// HTTPS_ENABLED 를 따로 정하지 않으면 운영(NODE_ENV=production)에서는 HTTPS 로 간주한다.
// 도메인 없이 IP(http://)로 임시 접속할 때만 HTTPS_ENABLED=false 로 둔다.
const isProd = process.env.NODE_ENV === 'production';

const httpsEnabled =
  process.env.HTTPS_ENABLED === undefined || process.env.HTTPS_ENABLED === ''
    ? isProd
    : process.env.HTTPS_ENABLED === 'true';

if (isProd && !httpsEnabled) {
  console.warn('[주의] HTTPS_ENABLED=false: 쿠키가 암호화되지 않은 http 로 전송됩니다. 도메인 연결 후 HTTPS 를 켜세요.');
}

module.exports = { isProd, httpsEnabled };
