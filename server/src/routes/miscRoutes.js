const express = require('express');
const ctrl = require('../controllers/settingsController');
const dash = require('../controllers/dashboardController');
const { authenticate, authorize, ADMIN_ROLES } = require('../middleware/auth');

const router = express.Router();

router.get('/health', ctrl.health);
router.get('/dashboard', authenticate, dash.dashboard);
router.get('/holidays', authenticate, ctrl.listHolidays);
router.post('/holidays', authenticate, authorize(...ADMIN_ROLES), ctrl.createHoliday);
router.delete('/holidays/:id', authenticate, authorize(...ADMIN_ROLES), ctrl.deleteHoliday);
router.get('/settings', authenticate, authorize(...ADMIN_ROLES), ctrl.getCompanySettings);
router.patch('/settings', authenticate, authorize(...ADMIN_ROLES), ctrl.updateCompanySettings);
router.get('/files/signed-url', authenticate, ctrl.signedUrl);
router.get('/audit', authenticate, authorize(...ADMIN_ROLES), ctrl.listAudit);

module.exports = router;
