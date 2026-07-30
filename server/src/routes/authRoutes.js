const express = require('express');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.get('/me', authenticate, ctrl.me);
router.post('/change-password', authenticate, ctrl.changePassword);
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
