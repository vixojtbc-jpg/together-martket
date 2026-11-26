const express = require('express');
const groupBuyController = require('../controllers/groupBuyController');
const { requireLogin } = require('../middlewares/auth');

const router = express.Router();

router.get('/:id', groupBuyController.show);
router.post('/:id/participations', requireLogin, groupBuyController.join);
router.delete('/:id/participations', requireLogin, groupBuyController.cancelParticipation);

module.exports = router;
