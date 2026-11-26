const myPageService = require('../services/myPageService');

// GET /me
async function show(req, res) {
  const page = await myPageService.getMyPage(req.user);
  res.render('pages/me', { title: '마이페이지 - 공구마켓', ...page });
}

module.exports = { show };
