const mongoose = require('mongoose');
const attachmentSchema = require('./attachmentSchema');

const ticketCommentSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

ticketCommentSchema.index({ ticket: 1, createdAt: -1 });

module.exports = mongoose.model('TicketComment', ticketCommentSchema);
