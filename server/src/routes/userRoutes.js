const express = require('express');
const ctrl = require('../controllers/userController');
const { authenticate, authorize, ADMIN_ROLES, MANAGER_PLUS } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/me/leave-balances', ctrl.getMyBalances);
router.get('/team', authorize(...MANAGER_PLUS), ctrl.getTeam);
router.get('/', authorize(...ADMIN_ROLES, 'manager'), ctrl.listUsers);
router.get('/:id', authorize(...ADMIN_ROLES, 'manager'), ctrl.getUser);
router.post('/', authorize(...ADMIN_ROLES), ctrl.createUser);
router.patch('/:id', authorize(...ADMIN_ROLES), ctrl.updateUser);

module.exports = router;
