const groupBuyService = require('../services/groupBuyService');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');

// GET /group-buys/:id
async function show(req, res) {
  const id = parseId(req.params.id);
  if (!id) throw new AppError(404, '공구를 찾을 수 없어요.');

  const gb = await groupBuyService.getDetail(id);
  res.render('pages/group-buys/show', { title: `${gb.title} - 공구마켓`, gb });
}

module.exports = { show };
