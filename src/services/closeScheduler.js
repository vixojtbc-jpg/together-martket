// 자동 마감 스케줄러: 1분마다 마감 시각이 지난 공구를 CLOSED / FAILED 로 바꾼다.
// (별도 패키지 없이 setInterval 사용. 여러 프로세스가 동시에 돌아도 행 잠금으로 한 번만 처리된다.)
const groupBuyService = require('./groupBuyService');

const DEFAULT_INTERVAL_MS = 60 * 1000;

function startCloseScheduler({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  let running = false;

  async function tick() {
    if (running) return; // 이전 실행이 아직 끝나지 않았으면 건너뜀
    running = true;
    try {
      const { closed, failed, errors } = await groupBuyService.closeExpired();
      if (closed.length || failed.length || errors) {
        console.log(
          `[자동 마감] 성공(CLOSED) ${closed.length}건 ${JSON.stringify(closed)}, ` +
            `실패(FAILED) ${failed.length}건 ${JSON.stringify(failed)}, 오류 ${errors}건`,
        );
      }
    } catch (err) {
      console.error('[자동 마감] 실행 중 오류', err);
    } finally {
      running = false;
    }
  }

  tick(); // 서버 시작 직후 한 번 (꺼져 있던 동안 지난 마감 처리)
  const timer = setInterval(tick, intervalMs);

  return {
    tick,
    stop() {
      clearInterval(timer);
    },
  };
}

module.exports = { startCloseScheduler };
