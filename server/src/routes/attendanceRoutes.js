const express = require('express');
const ctrl = require('../controllers/attendanceController');
const { authenticate, authorize, MANAGER_PLUS, ADMIN_ROLES } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/me', ctrl.myAttendance);
router.get('/summary', ctrl.summary);
router.get('/export', authorize(...MANAGER_PLUS), ctrl.exportCsv);
router.get('/', authorize(...MANAGER_PLUS), ctrl.listAttendance);
router.post('/override', authorize(...MANAGER_PLUS), ctrl.override);

module.exports = router;
