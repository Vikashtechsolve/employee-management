const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employee: 1, leaveType: 1, year: 1 }, { unique: true });
leaveBalanceSchema.virtual('remaining').get(function remaining() {
  return this.allocated - this.used - this.pending;
});
leaveBalanceSchema.set('toJSON', { virtuals: true });
leaveBalanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
