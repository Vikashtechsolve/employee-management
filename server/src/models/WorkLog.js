const mongoose = require('mongoose');
const attachmentSchema = require('./attachmentSchema');

const workLogSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD in company timezone
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    hoursWorked: { type: Number, default: 8, min: 0, max: 24 },
    linkedTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }],
    attachments: [attachmentSchema],
    status: { type: String, enum: ['draft', 'submitted'], default: 'draft' },
    submittedAt: { type: Date, default: null },
    locked: { type: Boolean, default: false },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

workLogSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkLog', workLogSchema);
