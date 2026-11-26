// GET /
// 지금은 레이아웃만 표시한다. 공구 목록은 다음 단계(기능 1)에서 구현한다.
async function home(req, res) {
  res.render('pages/home', { title: '공구마켓' });
}

module.exports = { home };
