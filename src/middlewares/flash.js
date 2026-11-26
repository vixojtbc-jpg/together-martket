// 한 번만 보여주는 알림 메시지 (리다이렉트 후 다음 화면에 표시)
// 사용: req.flash('success', '참여했어요!') → 다음 페이지에서 res.locals.flash 로 표시
function flash(req, res, next) {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  req.flash = (type, message) => {
    req.session.flash = { type, message };
  };
  next();
}

module.exports = flash;
