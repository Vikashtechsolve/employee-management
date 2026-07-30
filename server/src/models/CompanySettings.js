const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    companyName: { type: String, default: 'Company EMS' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    workWeek: {
      type: [Number],
      default: [1, 2, 3, 4, 5], // Mon-Fri (0=Sun)
    },
    defaultCutoff: { type: String, default: '11:00' },
    maxAttachmentSizeMb: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
