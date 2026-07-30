const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true, unique: true },
    optional: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Holiday', holidaySchema);
