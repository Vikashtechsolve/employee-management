const Attendance = require('../models/Attendance');
const WorkLog = require('../models/WorkLog');
const LeaveRequest = require('../models/LeaveRequest');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const LeaveBalance = require('../models/LeaveBalance');
const { getTodayString } = require('../utils/dates');
const { isAdminLike } = require('../middleware/auth');
const { ensureBalances } = require('../services/leaveEngine');
const { asyncHandler } = require('../utils/errors');
const env = require('../config/env');

const dashboard = asyncHandler(async (req, res) => {
  const today = getTodayString(env.companyTimezone);
  const user = req.user;
  const role = user.role;

  if (role === 'employee' || (!isAdminLike(user) && role !== 'manager')) {
    const [attendance, workLog, tickets, leavePending] = await Promise.all([
      Attendance.findOne({ employee: user._id, date: today }),
      WorkLog.findOne({ employee: user._id, date: today }),
      Ticket.find({
        assignee: user._id,
        status: { $nin: ['done', 'cancelled'] },
      })
        .sort({ dueDate: 1 })
        .limit(8),
      LeaveRequest.countDocuments({ employee: user._id, status: 'pending' }),
    ]);

    await ensureBalances(user._id, new Date().getFullYear());
    const balances = await LeaveBalance.find({
      employee: user._id,
      year: new Date().getFullYear(),
    }).populate('leaveType', 'name code');

    const overdue = tickets.filter((t) => t.dueDate && t.dueDate < new Date());

    return res.json({
      success: true,
      data: {
        role: 'employee',
        today,
        attendance,
        workLog,
        openTickets: tickets,
        overdueCount: overdue.length,
        leavePending,
        leaveBalances: balances.map((b) => ({
          ...b.toObject(),
          remaining: b.allocated - b.used - b.pending,
        })),
      },
    });
  }

  if (role === 'manager' && !isAdminLike(user)) {
    const teamIds = await User.find({ manager: user._id, isActive: true }).distinct('_id');
    const [teamAttendance, pendingLeaves, teamTickets, submissions] = await Promise.all([
      Attendance.find({ employee: { $in: teamIds }, date: today }).populate(
        'employee',
        'name employeeId'
      ),
      LeaveRequest.find({ employee: { $in: teamIds }, status: 'pending' })
        .populate('employee', 'name employeeId')
        .populate('leaveType', 'name'),
      Ticket.find({
        assignee: { $in: teamIds },
        status: { $nin: ['done', 'cancelled'] },
      })
        .populate('assignee', 'name')
        .sort({ dueDate: 1 })
        .limit(20),
      WorkLog.find({ employee: { $in: teamIds }, date: today })
        .populate('employee', 'name employeeId')
        .sort({ submittedAt: -1 }),
    ]);

    const present = teamAttendance.filter((a) => ['present', 'late'].includes(a.status)).length;
    const overdue = teamTickets.filter((t) => t.dueDate && t.dueDate < new Date());

    return res.json({
      success: true,
      data: {
        role: 'manager',
        today,
        teamSize: teamIds.length,
        presentToday: present,
        teamAttendance,
        pendingLeaves,
        teamTickets,
        overdueCount: overdue.length,
        submissions,
      },
    });
  }

  // Admin / HR / Super — work management focused dashboard
  const activeEmployees = await User.find({
    isActive: true,
    role: { $in: ['employee', 'manager', 'hr'] },
  })
    .populate('department', 'name')
    .select('name employeeId email department role');

  const empIds = activeEmployees.map((e) => e._id);

  const [todayAttendance, pendingLeaves, openTickets, todayWorkLogs, inactive] =
    await Promise.all([
      Attendance.find({ date: today, employee: { $in: empIds } }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      Ticket.find({ status: { $nin: ['done', 'cancelled'] } }),
      WorkLog.find({ date: today, employee: { $in: empIds } })
        .populate('employee', 'name employeeId department')
        .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
        .sort({ submittedAt: -1 }),
      User.countDocuments({ isActive: false }),
    ]);

  const workByEmp = Object.fromEntries(
    todayWorkLogs.map((w) => [String(w.employee._id || w.employee), w])
  );
  const attByEmp = Object.fromEntries(
    todayAttendance.map((a) => [String(a.employee), a])
  );

  const workRows = activeEmployees.map((emp) => {
    const workLog = workByEmp[String(emp._id)] || null;
    const attendance = attByEmp[String(emp._id)] || null;
    const submitted = Boolean(workLog && workLog.status === 'submitted');
    return {
      employee: emp.toSafeJSON(),
      workLog,
      attendance,
      submitted,
      missing: !submitted,
      reviewed: Boolean(workLog?.reviewedAt),
    };
  });

  const submittedRows = workRows.filter((r) => r.submitted);
  const missingRows = workRows.filter((r) => r.missing);
  const unreviewedRows = submittedRows.filter((r) => !r.reviewed);

  const statusCounts = todayAttendance.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  // Last 7 days submission trend (relative to company "today")
  const trendDates = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(`${today}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - i);
    trendDates.push(d.toISOString().slice(0, 10));
  }

  const weekLogs = await WorkLog.aggregate([
    {
      $match: {
        date: { $in: trendDates },
        status: 'submitted',
        employee: { $in: empIds },
      },
    },
    { $group: { _id: '$date', count: { $sum: 1 } } },
  ]);
  const weekMap = Object.fromEntries(weekLogs.map((w) => [w._id, w.count]));
  const weeklyTrend = trendDates.map((date) => ({
    date,
    submitted: weekMap[date] || 0,
    total: activeEmployees.length,
  }));

  // Department breakdown
  const deptMap = {};
  for (const row of workRows) {
    const deptName = row.employee.department?.name || 'Unassigned';
    if (!deptMap[deptName]) deptMap[deptName] = { name: deptName, total: 0, submitted: 0 };
    deptMap[deptName].total += 1;
    if (row.submitted) deptMap[deptName].submitted += 1;
  }
  const byDepartment = Object.values(deptMap).map((d) => ({
    ...d,
    missing: d.total - d.submitted,
    rate: d.total ? Math.round((d.submitted / d.total) * 100) : 0,
  }));

  const overdueTickets = openTickets.filter((t) => t.dueDate && t.dueDate < new Date());
  const total = activeEmployees.length;
  const submittedCount = submittedRows.length;

  res.json({
    success: true,
    data: {
      role: 'admin',
      today,
      activeEmployees: total,
      inactiveEmployees: inactive,
      submissionsToday: submittedCount,
      attendanceToday: statusCounts,
      presentRate:
        total > 0
          ? Math.round(
              (((statusCounts.present || 0) + (statusCounts.late || 0)) / total) * 100
            )
          : 0,
      workCompletionRate: total > 0 ? Math.round((submittedCount / total) * 100) : 0,
      missingToday: missingRows.length,
      unreviewedToday: unreviewedRows.length,
      reviewedToday: submittedRows.filter((r) => r.reviewed).length,
      pendingLeaves,
      openTickets: openTickets.length,
      overdueTickets: overdueTickets.length,
      weeklyTrend,
      byDepartment,
      submittedToday: submittedRows.slice(0, 12).map((r) => ({
        employee: r.employee,
        title: r.workLog?.title,
        hoursWorked: r.workLog?.hoursWorked,
        attachments: r.workLog?.attachments?.length || 0,
        submittedAt: r.workLog?.submittedAt,
        attendance: r.attendance?.status || null,
        reviewed: r.reviewed,
        workLogId: r.workLog?._id,
      })),
      missingList: missingRows.slice(0, 12).map((r) => ({
        employee: r.employee,
        attendance: r.attendance?.status || null,
      })),
      unreviewedList: unreviewedRows.slice(0, 12).map((r) => ({
        employee: r.employee,
        title: r.workLog?.title,
        workLogId: r.workLog?._id,
        submittedAt: r.workLog?.submittedAt,
      })),
    },
  });
});

module.exports = { dashboard };
