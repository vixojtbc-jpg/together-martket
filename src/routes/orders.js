const express = require('express');
const orderController = require('../controllers/orderController');
const { requireLogin } = require('../middlewares/auth');

const router = express.Router();

router.use(requireLogin);
router.get('/', orderController.index);
router.get('/:id/pay', orderController.payForm);
router.post('/:id/pay', orderController.pay);

module.exports = router;
