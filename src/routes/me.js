const express = require('express');
const myPageController = require('../controllers/myPageController');
const { requireLogin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', requireLogin, myPageController.show);

module.exports = router;
