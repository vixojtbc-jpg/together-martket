const express = require('express');
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireRole('ADMIN'));
router.get('/', adminController.dashboard);
router.get('/users', adminController.users);
router.post('/users/:id/role', adminController.changeRole);
router.get('/group-buys', adminController.groupBuys);
router.post('/group-buys/:id/cancel', adminController.cancelGroupBuy);

module.exports = router;
