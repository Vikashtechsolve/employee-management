const WorkLog = require('../models/WorkLog');
const User = require('../models/User');
const { uploadFiles, deleteMany } = require('../services/r2Storage');
const { onWorkLogSubmit } = require('../services/attendanceEngine');
const { ApiError, asyncHandler } = require('../utils/errors');
const { getTodayString } = require('../utils/dates');
const { isAdminLike, isManagerPlus } = require('../middleware/auth');
const env = require('../config/env');

const submitWork = asyncHandler(async (req, res) => {
  const date = req.body.date || getTodayString(env.companyTimezone);
  const { title, description, hoursWorked, linkedTickets, status = 'submitted' } = req.body;

  if (!title || !description) throw new ApiError(400, 'Title and description required');

  let workLog = await WorkLog.findOne({ employee: req.user._id, date });
  if (workLog?.locked) throw new ApiError(400, 'This work log is locked');

  const files = req.files || [];
  if (status === 'submitted' && !workLog?.attachments?.length && files.length === 0) {
    throw new ApiError(400, 'At least one screenshot or file is required to mark attendance');
  }

  const uploaded = await uploadFiles(files, { module: 'worklogs', userId: req.user._id });

  if (!workLog) {
    workLog = new WorkLog({
      employee: req.user._id,
      date,
      title,
      description,
      hoursWorked: Number(hoursWorked) || 8,
      linkedTickets: linkedTickets
        ? Array.isArray(linkedTickets)
          ? linkedTickets
          : JSON.parse(linkedTickets)
        : [],
      attachments: uploaded,
      status,
      submittedAt: status === 'submitted' ? new Date() : null,
    });
  } else {
    workLog.title = title;
    workLog.description = description;
    workLog.hoursWorked = Number(hoursWorked) || workLog.hoursWorked;
    if (linkedTickets) {
      workLog.linkedTickets = Array.isArray(linkedTickets)
        ? linkedTickets
        : JSON.parse(linkedTickets);
    }
    if (uploaded.length) workLog.attachments.push(...uploaded);
    workLog.status = status;
    if (status === 'submitted') workLog.submittedAt = new Date();
  }

  await workLog.save();

  let attendance = null;
  if (workLog.status === 'submitted') {
    attendance = await onWorkLogSubmit({
      employee: req.user,
      date,
      submittedAt: workLog.submittedAt,
      workLogId: workLog._id,
      actorId: req.user._id,
    });
  }

  const populated = await WorkLog.findById(workLog._id)
    .populate('linkedTickets', 'ticketNumber title status')
    .populate('employee', 'name employeeId');

  res.status(201).json({ success: true, data: { workLog: populated, attendance } });
});

const myWorkLogs = asyncHandler(async (req, res) => {
  const { from, to, page = 1, limit = 30 } = req.query;
  const filter = { employee: req.user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    WorkLog.find(filter)
      .populate('linkedTickets', 'ticketNumber title status')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit)),
    WorkLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

const getTodayWork = asyncHandler(async (req, res) => {
  const date = req.query.date || getTodayString(env.companyTimezone);
  const workLog = await WorkLog.findOne({ employee: req.user._id, date }).populate(
    'linkedTickets',
    'ticketNumber title status'
  );
  res.json({ success: true, data: workLog });
});

const listAllWorkLogs = asyncHandler(async (req, res) => {
  const { from, to, employee, department, page = 1, limit = 30 } = req.query;
  const filter = {};

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (employee) filter.employee = employee;

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const teamIds = await User.find({ manager: req.user._id }).distinct('_id');
    if (employee) {
      if (!teamIds.map(String).includes(String(employee))) {
        throw new ApiError(403, 'Not your team member');
      }
    } else {
      filter.employee = { $in: teamIds };
    }
  } else if (department) {
    const empIds = await User.find({ department }).distinct('_id');
    filter.employee = { $in: empIds };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    WorkLog.find(filter)
      .populate('employee', 'name employeeId email department')
      .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
      .populate('linkedTickets', 'ticketNumber title')
      .sort({ date: -1, submittedAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    WorkLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

const getWorkLogById = asyncHandler(async (req, res) => {
  const Attendance = require('../models/Attendance');
  const workLog = await WorkLog.findById(req.params.id)
    .populate('employee', 'name employeeId email department designation')
    .populate({ path: 'employee', populate: { path: 'department', select: 'name code' } })
    .populate('linkedTickets', 'ticketNumber title status');

  if (!workLog) throw new ApiError(404, 'Work log not found');

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const member = await User.findOne({
      _id: workLog.employee._id || workLog.employee,
      manager: req.user._id,
    });
    if (!member) throw new ApiError(403, 'Not your team member');
  }

  const attendance = await Attendance.findOne({
    employee: workLog.employee._id || workLog.employee,
    date: workLog.date,
  });

  res.json({ success: true, data: { workLog, attendance } });
});

/** Admin/Manager board: every employee for a day + their work + attendance */
const dailyBoard = asyncHandler(async (req, res) => {
  const Attendance = require('../models/Attendance');
  const date = req.query.date || getTodayString(env.companyTimezone);
  const { department, search = '', status } = req.query;

  const userFilter = {
    isActive: true,
    role: { $in: ['employee', 'manager', 'hr'] },
  };

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    userFilter.manager = req.user._id;
    userFilter.role = 'employee';
  }
  if (department) userFilter.department = department;
  if (search) {
    userFilter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { employeeId: new RegExp(search, 'i') },
    ];
  }

  const employees = await User.find(userFilter)
    .populate('department', 'name code')
    .sort({ name: 1 })
    .select('name email employeeId department designation role');

  const empIds = employees.map((e) => e._id);
  const [workLogs, attendanceRows] = await Promise.all([
    WorkLog.find({ employee: { $in: empIds }, date }).populate(
      'linkedTickets',
      'ticketNumber title status'
    ),
    Attendance.find({ employee: { $in: empIds }, date }),
  ]);

  const workByEmp = Object.fromEntries(workLogs.map((w) => [String(w.employee), w]));
  const attByEmp = Object.fromEntries(attendanceRows.map((a) => [String(a.employee), a]));

  let rows = employees.map((emp) => {
    const workLog = workByEmp[String(emp._id)] || null;
    const attendance = attByEmp[String(emp._id)] || null;
    const submitted = Boolean(workLog && workLog.status === 'submitted');
    return {
      employee: emp.toSafeJSON(),
      workLog,
      attendance,
      submitted,
      missing: !submitted,
    };
  });

  const allSubmitted = employees.filter((e) => {
    const w = workByEmp[String(e._id)];
    return w && w.status === 'submitted';
  }).length;

  if (status === 'submitted') rows = rows.filter((r) => r.submitted);
  if (status === 'missing') rows = rows.filter((r) => r.missing);
  if (status === 'reviewed') rows = rows.filter((r) => r.workLog?.reviewedAt);
  if (status === 'unreviewed') {
    rows = rows.filter((r) => r.submitted && !r.workLog?.reviewedAt);
  }

  const reviewedCount = workLogs.filter((w) => w.status === 'submitted' && w.reviewedAt).length;
  const lateCount = attendanceRows.filter((a) => a.status === 'late').length;
  const presentCount = attendanceRows.filter((a) => a.status === 'present').length;

  res.json({
    success: true,
    data: {
      date,
      summary: {
        total: employees.length,
        submitted: allSubmitted,
        missing: employees.length - allSubmitted,
        withAttachments: workLogs.filter((w) => (w.attachments || []).length > 0).length,
        reviewed: reviewedCount,
        unreviewed: Math.max(0, allSubmitted - reviewedCount),
        present: presentCount,
        late: lateCount,
        completionRate:
          employees.length > 0 ? Math.round((allSubmitted / employees.length) * 100) : 0,
      },
      rows,
    },
  });
});

const reviewWorkLog = asyncHandler(async (req, res) => {
  if (!isManagerPlus(req.user)) throw new ApiError(403, 'Not allowed');

  const workLog = await WorkLog.findById(req.params.id);
  if (!workLog) throw new ApiError(404, 'Work log not found');

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const member = await User.findOne({ _id: workLog.employee, manager: req.user._id });
    if (!member) throw new ApiError(403, 'Not your team member');
  }

  const { adminNote, locked, reviewed = true } = req.body;

  if (adminNote !== undefined) workLog.adminNote = adminNote;
  if (locked !== undefined) workLog.locked = Boolean(locked);

  if (reviewed) {
    workLog.reviewedAt = new Date();
    workLog.reviewedBy = req.user._id;
  } else {
    workLog.reviewedAt = null;
    workLog.reviewedBy = null;
  }

  await workLog.save();

  const populated = await WorkLog.findById(workLog._id)
    .populate('employee', 'name employeeId email')
    .populate('reviewedBy', 'name');

  res.json({ success: true, data: populated });
});

const removeAttachment = asyncHandler(async (req, res) => {
  const workLog = await WorkLog.findById(req.params.id);
  if (!workLog) throw new ApiError(404, 'Work log not found');
  if (String(workLog.employee) !== String(req.user._id) && !isManagerPlus(req.user)) {
    throw new ApiError(403, 'Not allowed');
  }
  if (workLog.locked) throw new ApiError(400, 'Work log is locked');

  const key = req.body.key;
  const before = workLog.attachments.length;
  workLog.attachments = workLog.attachments.filter((a) => a.key !== key);
  if (workLog.attachments.length === before) throw new ApiError(404, 'Attachment not found');
  await workLog.save();
  await deleteMany([key]);
  res.json({ success: true, data: workLog });
});

module.exports = {
  submitWork,
  myWorkLogs,
  getTodayWork,
  listAllWorkLogs,
  getWorkLogById,
  dailyBoard,
  reviewWorkLog,
  removeAttachment,
};
