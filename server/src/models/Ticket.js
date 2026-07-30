const mongoose = require('mongoose');
const attachmentSchema = require('./attachmentSchema');

const activitySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'],
      default: 'open',
    },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    dueDate: { type: Date, default: null },
    attachments: [attachmentSchema],
    activity: [activitySchema],
  },
  { timestamps: true }
);

ticketSchema.index({ assignee: 1, status: 1, dueDate: 1 });

ticketSchema.pre('save', async function generateTicketNumber() {
  if (this.ticketNumber) return;
  const count = await this.constructor.countDocuments();
  this.ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;
});

module.exports = mongoose.model('Ticket', ticketSchema);
