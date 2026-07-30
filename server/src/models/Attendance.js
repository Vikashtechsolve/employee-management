const mongoose = require('mongoose');

const ATTENDANCE_STATUSES = [
  'present',
  'late',
  'absent',
  'half_day',
  'on_leave',
  'holiday',
  'weekend',
];

const ATTENDANCE_SOURCES = ['auto_work', 'leave', 'manual', 'holiday_calendar', 'cron'];

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    source: { type: String, enum: ATTENDANCE_SOURCES, default: 'auto_work' },
    workLog: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkLog', default: null },
    remarks: { type: String, default: '' },
    previousStatus: { type: String, default: null },
    overrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    overrideAt: { type: Date, default: null },
    overrideReason: { type: String, default: '' },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
module.exports.ATTENDANCE_SOURCES = ATTENDANCE_SOURCES;
