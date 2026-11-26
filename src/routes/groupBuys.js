const express = require('express');
const groupBuyController = require('../controllers/groupBuyController');

const router = express.Router();

router.get('/:id', groupBuyController.show);

module.exports = router;
