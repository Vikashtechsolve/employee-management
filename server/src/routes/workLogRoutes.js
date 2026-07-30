const express = require('express');
const ctrl = require('../controllers/workLogController');
const { authenticate, authorize, MANAGER_PLUS } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.post('/', upload.array('files', 10), ctrl.submitWork);
router.get('/me', ctrl.myWorkLogs);
router.get('/today', ctrl.getTodayWork);
router.get('/board', authorize(...MANAGER_PLUS), ctrl.dailyBoard);
router.get('/all', authorize(...MANAGER_PLUS), ctrl.listAllWorkLogs);
router.get('/:id', authorize(...MANAGER_PLUS), ctrl.getWorkLogById);
router.patch('/:id/review', authorize(...MANAGER_PLUS), ctrl.reviewWorkLog);
router.delete('/:id/attachments', ctrl.removeAttachment);

module.exports = router;
