const groupBuyService = require('../services/groupBuyService');

// GET / — 진행 중인 공구 목록
async function home(req, res) {
  const groupBuys = await groupBuyService.getOpenGroupBuys();
  res.render('pages/home', { title: '공구마켓', groupBuys });
}

module.exports = { home };
