const express = require('express');
const ctrl = require('../controllers/departmentController');
const { authenticate, authorize, ADMIN_ROLES } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, ctrl.listDepartments);
router.post('/', authenticate, authorize(...ADMIN_ROLES), ctrl.createDepartment);
router.patch('/:id', authenticate, authorize(...ADMIN_ROLES), ctrl.updateDepartment);

module.exports = router;
