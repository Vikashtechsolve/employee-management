const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const env = require('../config/env');
const { getTimeHM, compareHM, getWeekday, getTodayString } = require('../utils/dates');

async function getSettings() {
  let settings = await CompanySettings.findOne({ key: 'default' });
  if (!settings) {
    settings = await CompanySettings.create({
      key: 'default',
      timezone: env.companyTimezone,
      defaultCutoff: env.defaultCutoff,
    });
  }
  return settings;
}

async function onWorkLogSubmit({ employee, date, submittedAt, workLogId, actorId }) {
  const settings = await getSettings();
  const timezone = settings.timezone || env.companyTimezone;
  const workWeek = settings.workWeek || [1, 2, 3, 4, 5];
  const weekday = getWeekday(date, timezone);

  let status;
  let source = 'auto_work';
  let remarks = '';

  const holiday = await Holiday.findOne({ date });
  if (holiday) {
    status = 'holiday';
    source = 'holiday_calendar';
    remarks = holiday.name;
  } else if (!workWeek.includes(weekday)) {
    status = 'weekend';
    source = 'holiday_calendar';
  } else {
    const onLeave = await LeaveRequest.findOne({
      employee: employee._id || employee,
      status: 'approved',
      startDate: { $lte: date },
      endDate: { $gte: date },
    });
    if (onLeave) {
      status = 'on_leave';
      source = 'leave';
    } else {
      const cutoff = employee.cutoffTime || settings.defaultCutoff || env.defaultCutoff;
      const submittedHM = getTimeHM(submittedAt || new Date(), timezone);
      status = compareHM(submittedHM, cutoff) <= 0 ? 'present' : 'late';
      source = 'auto_work';
      remarks = `Submitted at ${submittedHM} (cutoff ${cutoff})`;
    }
  }

  const existing = await Attendance.findOne({ employee: employee._id || employee, date });
  if (existing && existing.source === 'manual') {
    return existing;
  }

  const previousStatus = existing?.status || null;
  const attendance = await Attendance.findOneAndUpdate(
    { employee: employee._id || employee, date },
    {
      status,
      source,
      workLog: workLogId,
      remarks,
      previousStatus,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  if (previousStatus && previousStatus !== status) {
    await AuditLog.create({
      actor: actorId || employee._id || employee,
      action: 'attendance.auto_update',
      entity: 'Attendance',
      entityId: attendance._id.toString(),
      meta: { date, from: previousStatus, to: status, source },
    });
  }

  return attendance;
}

async function overrideAttendance({
  employeeId,
  date,
  status,
  reason,
  actorId,
}) {
  const existing = await Attendance.findOne({ employee: employeeId, date });
  const previousStatus = existing?.status || null;

  const attendance = await Attendance.findOneAndUpdate(
    { employee: employeeId, date },
    {
      status,
      source: 'manual',
      previousStatus,
      overrideBy: actorId,
      overrideAt: new Date(),
      overrideReason: reason,
      remarks: reason,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  await AuditLog.create({
    actor: actorId,
    action: 'attendance.override',
    entity: 'Attendance',
    entityId: attendance._id.toString(),
    meta: { date, from: previousStatus, to: status, reason },
  });

  return attendance;
}

async function markAbsentsForDate(dateStr) {
  const settings = await getSettings();
  const timezone = settings.timezone || env.companyTimezone;
  const workWeek = settings.workWeek || [1, 2, 3, 4, 5];
  const date = dateStr || getTodayString(timezone);

  if (await Holiday.findOne({ date })) return { date, marked: 0, reason: 'holiday' };
  if (!workWeek.includes(getWeekday(date, timezone))) {
    return { date, marked: 0, reason: 'weekend' };
  }

  const employees = await User.find({ isActive: true, role: { $ne: 'super_admin' } }).select(
    '_id'
  );
  let marked = 0;

  for (const emp of employees) {
    const existing = await Attendance.findOne({ employee: emp._id, date });
    if (existing) continue;

    const onLeave = await LeaveRequest.findOne({
      employee: emp._id,
      status: 'approved',
      startDate: { $lte: date },
      endDate: { $gte: date },
    });

    if (onLeave) {
      await Attendance.create({
        employee: emp._id,
        date,
        status: 'on_leave',
        source: 'leave',
      });
    } else {
      await Attendance.create({
        employee: emp._id,
        date,
        status: 'absent',
        source: 'cron',
        remarks: 'Auto-marked absent (no work submission)',
      });
      marked += 1;
    }
  }

  return { date, marked };
}

async function syncLeaveAttendance(employeeId, startDate, endDate, actorId) {
  const { eachDateInclusive } = require('../utils/dates');
  const dates = eachDateInclusive(startDate, endDate);
  for (const date of dates) {
    await Attendance.findOneAndUpdate(
      { employee: employeeId, date },
      {
        status: 'on_leave',
        source: 'leave',
        remarks: 'Approved leave',
        overrideBy: actorId,
        overrideAt: new Date(),
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }
}

module.exports = {
  getSettings,
  onWorkLogSubmit,
  overrideAttendance,
  markAbsentsForDate,
  syncLeaveAttendance,
};
