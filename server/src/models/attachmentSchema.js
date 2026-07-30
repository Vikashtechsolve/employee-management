const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    url: { type: String, default: '' },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

module.exports = attachmentSchema;
