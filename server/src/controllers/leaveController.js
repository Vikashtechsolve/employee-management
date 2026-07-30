const LeaveType = require('../models/LeaveType');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const User = require('../models/User');
const { applyLeave, reviewLeave, cancelLeave, ensureBalances } = require('../services/leaveEngine');
const { uploadFiles } = require('../services/r2Storage');
const { ApiError, asyncHandler } = require('../utils/errors');
const { isAdminLike } = require('../middleware/auth');

const listLeaveTypes = asyncHandler(async (req, res) => {
  const items = await LeaveType.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: items });
});

const createLeaveType = asyncHandler(async (req, res) => {
  const item = await LeaveType.create(req.body);
  res.status(201).json({ success: true, data: item });
});

const apply = asyncHandler(async (req, res) => {
  const { leaveTypeId, startDate, endDate, reason } = req.body;
  if (!leaveTypeId || !startDate || !endDate || !reason) {
    throw new ApiError(400, 'leaveTypeId, startDate, endDate, reason required');
  }
  const attachments = await uploadFiles(req.files || [], {
    module: 'leaves',
    userId: req.user._id,
  });
  const request = await applyLeave({
    employeeId: req.user._id,
    leaveTypeId,
    startDate,
    endDate,
    reason,
    attachments,
  });
  const populated = await LeaveRequest.findById(request._id).populate('leaveType', 'name code');
  res.status(201).json({ success: true, data: populated });
});

const myLeaves = asyncHandler(async (req, res) => {
  const items = await LeaveRequest.find({ employee: req.user._id })
    .populate('leaveType', 'name code')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: items });
});

const listLeaves = asyncHandler(async (req, res) => {
  const { status, employee, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (employee) filter.employee = employee;

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const teamIds = await User.find({ manager: req.user._id }).distinct('_id');
    filter.employee = { $in: teamIds };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate('employee', 'name employeeId email')
      .populate('leaveType', 'name code')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    LeaveRequest.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

const review = asyncHandler(async (req, res) => {
  const { decision, reviewNote } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    throw new ApiError(400, 'decision must be approved or rejected');
  }

  const existing = await LeaveRequest.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Not found');

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const member = await User.findOne({ _id: existing.employee, manager: req.user._id });
    if (!member) throw new ApiError(403, 'Not your team member');
  }

  const request = await reviewLeave({
    requestId: req.params.id,
    decision,
    reviewNote,
    actorId: req.user._id,
  });

  const populated = await LeaveRequest.findById(request._id)
    .populate('employee', 'name employeeId')
    .populate('leaveType', 'name code');

  res.json({ success: true, data: populated });
});

const cancel = asyncHandler(async (req, res) => {
  const request = await cancelLeave({
    requestId: req.params.id,
    employeeId: req.user._id,
    isAdmin: isAdminLike(req.user),
  });
  res.json({ success: true, data: request });
});

const balancesForEmployee = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const employeeId = req.params.employeeId;
  await ensureBalances(employeeId, year);
  const balances = await LeaveBalance.find({ employee: employeeId, year }).populate(
    'leaveType',
    'name code'
  );
  res.json({
    success: true,
    data: balances.map((b) => ({
      ...b.toObject(),
      remaining: b.allocated - b.used - b.pending,
    })),
  });
});

module.exports = {
  listLeaveTypes,
  createLeaveType,
  apply,
  myLeaves,
  listLeaves,
  review,
  cancel,
  balancesForEmployee,
};
