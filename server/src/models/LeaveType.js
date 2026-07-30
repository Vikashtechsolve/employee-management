const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    paid: { type: Boolean, default: true },
    defaultDays: { type: Number, default: 0 },
    requiresDocument: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
