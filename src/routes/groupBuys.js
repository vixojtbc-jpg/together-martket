const express = require('express');
const groupBuyController = require('../controllers/groupBuyController');
const groupBuyFormController = require('../controllers/groupBuyFormController');
const { requireLogin, requireRole } = require('../middlewares/auth');
const { uploadSingle } = require('../services/imageStorage');

const router = express.Router();
const hostOnly = requireRole('HOST');

// 공구 등록 / 수정 / 취소 (공구장)
router.get('/new', hostOnly, groupBuyFormController.newForm);
router.post('/', hostOnly, uploadSingle('image'), groupBuyFormController.create);
router.get('/:id/edit', hostOnly, groupBuyFormController.editForm);
router.put('/:id', hostOnly, uploadSingle('image'), groupBuyFormController.update);
router.post('/:id/cancel', requireRole('HOST', 'ADMIN'), groupBuyFormController.cancel);

// 상세 / 참여
router.get('/:id', groupBuyController.show);
router.post('/:id/participations', requireLogin, groupBuyController.join);
router.delete('/:id/participations', requireLogin, groupBuyController.cancelParticipation);

module.exports = router;
