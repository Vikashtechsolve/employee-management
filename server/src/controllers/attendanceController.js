const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { overrideAttendance } = require('../services/attendanceEngine');
const { ApiError, asyncHandler } = require('../utils/errors');
const { isAdminLike } = require('../middleware/auth');
const { escapeCsv } = require('../utils/dates');

const myAttendance = asyncHandler(async (req, res) => {
  const { from, to, month } = req.query;
  const filter = { employee: req.user._id };
  if (month) {
    filter.date = new RegExp(`^${month}`);
  } else if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const items = await Attendance.find(filter).populate('workLog').sort({ date: -1 });
  res.json({ success: true, data: items });
});

const listAttendance = asyncHandler(async (req, res) => {
  const { from, to, date, employee, department, status, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (date) filter.date = date;
  else if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (status) filter.status = status;
  if (employee) filter.employee = employee;

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const teamIds = await User.find({ manager: req.user._id }).distinct('_id');
    filter.employee = employee ? employee : { $in: teamIds };
    if (employee && !teamIds.map(String).includes(String(employee))) {
      throw new ApiError(403, 'Not your team member');
    }
  } else if (department) {
    const empIds = await User.find({ department }).distinct('_id');
    filter.employee = { $in: empIds };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Attendance.find(filter)
      .populate('employee', 'name employeeId email department')
      .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
      .populate('workLog', 'title submittedAt attachments')
      .populate('overrideBy', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Attendance.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

const override = asyncHandler(async (req, res) => {
  const { employeeId, date, status, reason } = req.body;
  if (!employeeId || !date || !status || !reason) {
    throw new ApiError(400, 'employeeId, date, status, reason required');
  }

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const member = await User.findOne({ _id: employeeId, manager: req.user._id });
    if (!member) throw new ApiError(403, 'Not your team member');
  }

  const attendance = await overrideAttendance({
    employeeId,
    date,
    status,
    reason,
    actorId: req.user._id,
  });

  res.json({ success: true, data: attendance });
});

const summary = asyncHandler(async (req, res) => {
  const { from, to, employee } = req.query;
  const match = {};
  if (employee) match.employee = require('mongoose').Types.ObjectId.createFromHexString(employee);
  else if (!isAdminLike(req.user) && req.user.role === 'manager') {
    const teamIds = await User.find({ manager: req.user._id }).distinct('_id');
    match.employee = { $in: teamIds };
  } else if (!isAdminLike(req.user) && req.user.role !== 'manager') {
    match.employee = req.user._id;
  }
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }

  const rows = await Attendance.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const result = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  res.json({ success: true, data: result });
});

const exportCsv = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const teamIds = await User.find({ manager: req.user._id }).distinct('_id');
    filter.employee = { $in: teamIds };
  }

  const items = await Attendance.find(filter)
    .populate('employee', 'name employeeId email')
    .sort({ date: 1 });

  const header = ['Date', 'Employee ID', 'Name', 'Email', 'Status', 'Source', 'Remarks'];
  const lines = [header.join(',')];
  for (const row of items) {
    lines.push(
      [
        row.date,
        row.employee?.employeeId,
        row.employee?.name,
        row.employee?.email,
        row.status,
        row.source,
        row.remarks,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
  res.send(lines.join('\n'));
});

module.exports = { myAttendance, listAttendance, override, summary, exportCsv };
