const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const CompanySettings = require('../models/CompanySettings');
const { ApiError } = require('../utils/errors');
const { countWeekdays } = require('../utils/dates');
const { syncLeaveAttendance } = require('./attendanceEngine');
const env = require('../config/env');

async function ensureBalances(employeeId, year) {
  const types = await LeaveType.find({ isActive: true });
  for (const type of types) {
    await LeaveBalance.findOneAndUpdate(
      { employee: employeeId, leaveType: type._id, year },
      { $setOnInsert: { allocated: type.defaultDays, used: 0, pending: 0 } },
      { upsert: true, returnDocument: 'after' }
    );
  }
}

async function calcLeaveDays(startDate, endDate) {
  const settings =
    (await CompanySettings.findOne({ key: 'default' })) || {
      workWeek: [1, 2, 3, 4, 5],
      timezone: env.companyTimezone,
    };
  return countWeekdays(
    startDate,
    endDate,
    settings.workWeek || [1, 2, 3, 4, 5],
    settings.timezone || env.companyTimezone
  );
}

async function applyLeave({ employeeId, leaveTypeId, startDate, endDate, reason, attachments }) {
  if (startDate > endDate) throw new ApiError(400, 'Invalid date range');

  const overlap = await LeaveRequest.findOne({
    employee: employeeId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (overlap) throw new ApiError(400, 'Overlapping leave request exists');

  const days = await calcLeaveDays(startDate, endDate);
  if (days <= 0) throw new ApiError(400, 'No working days in selected range');

  const year = Number(startDate.slice(0, 4));
  await ensureBalances(employeeId, year);

  const balance = await LeaveBalance.findOne({
    employee: employeeId,
    leaveType: leaveTypeId,
    year,
  });
  if (!balance) throw new ApiError(400, 'Leave balance not found');
  const remaining = balance.allocated - balance.used - balance.pending;
  if (remaining < days) {
    throw new ApiError(400, `Insufficient leave balance. Remaining: ${remaining}`);
  }

  balance.pending += days;
  await balance.save();

  const request = await LeaveRequest.create({
    employee: employeeId,
    leaveType: leaveTypeId,
    startDate,
    endDate,
    days,
    reason,
    attachments: attachments || [],
    status: 'pending',
  });

  return request;
}

async function reviewLeave({ requestId, decision, reviewNote, actorId }) {
  const request = await LeaveRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Leave request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Request already reviewed');

  const year = Number(request.startDate.slice(0, 4));
  const balance = await LeaveBalance.findOne({
    employee: request.employee,
    leaveType: request.leaveType,
    year,
  });

  if (decision === 'approved') {
    request.status = 'approved';
    if (balance) {
      balance.pending = Math.max(0, balance.pending - request.days);
      balance.used += request.days;
      await balance.save();
    }
    await syncLeaveAttendance(request.employee, request.startDate, request.endDate, actorId);
  } else if (decision === 'rejected') {
    request.status = 'rejected';
    if (balance) {
      balance.pending = Math.max(0, balance.pending - request.days);
      await balance.save();
    }
  } else {
    throw new ApiError(400, 'Invalid decision');
  }

  request.reviewedBy = actorId;
  request.reviewedAt = new Date();
  request.reviewNote = reviewNote || '';
  await request.save();
  return request;
}

async function cancelLeave({ requestId, employeeId, isAdmin }) {
  const request = await LeaveRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Leave request not found');
  if (!isAdmin && String(request.employee) !== String(employeeId)) {
    throw new ApiError(403, 'Not allowed');
  }
  if (request.status !== 'pending') {
    throw new ApiError(400, 'Only pending requests can be cancelled');
  }

  const year = Number(request.startDate.slice(0, 4));
  const balance = await LeaveBalance.findOne({
    employee: request.employee,
    leaveType: request.leaveType,
    year,
  });
  if (balance) {
    balance.pending = Math.max(0, balance.pending - request.days);
    await balance.save();
  }

  request.status = 'cancelled';
  await request.save();
  return request;
}

module.exports = {
  ensureBalances,
  calcLeaveDays,
  applyLeave,
  reviewLeave,
  cancelLeave,
};
