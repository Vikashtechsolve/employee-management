const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const departmentRoutes = require('./departmentRoutes');
const workLogRoutes = require('./workLogRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const leaveRoutes = require('./leaveRoutes');
const ticketRoutes = require('./ticketRoutes');
const miscRoutes = require('./miscRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/worklogs', workLogRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/tickets', ticketRoutes);
router.use('/', miscRoutes);

module.exports = router;
