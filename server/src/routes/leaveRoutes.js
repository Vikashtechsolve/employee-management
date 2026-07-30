const express = require('express');
const ctrl = require('../controllers/leaveController');
const { authenticate, authorize, MANAGER_PLUS, ADMIN_ROLES } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.get('/types', ctrl.listLeaveTypes);
router.post('/types', authorize(...ADMIN_ROLES), ctrl.createLeaveType);
router.post('/apply', upload.array('files', 5), ctrl.apply);
router.get('/me', ctrl.myLeaves);
router.get('/', authorize(...MANAGER_PLUS), ctrl.listLeaves);
router.post('/:id/review', authorize(...MANAGER_PLUS), ctrl.review);
router.post('/:id/cancel', ctrl.cancel);
router.get('/balances/:employeeId', authorize(...ADMIN_ROLES), ctrl.balancesForEmployee);

module.exports = router;
