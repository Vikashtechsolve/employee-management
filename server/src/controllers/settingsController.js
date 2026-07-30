const Holiday = require('../models/Holiday');
const CompanySettings = require('../models/CompanySettings');
const AuditLog = require('../models/AuditLog');
const { getSettings } = require('../services/attendanceEngine');
const { getSignedDownloadUrl, isR2Configured } = require('../services/r2Storage');
const { ApiError, asyncHandler } = require('../utils/errors');
const env = require('../config/env');

const listHolidays = asyncHandler(async (req, res) => {
  const year = req.query.year || String(new Date().getFullYear());
  const items = await Holiday.find({ date: new RegExp(`^${year}`) }).sort({ date: 1 });
  res.json({ success: true, data: items });
});

const createHoliday = asyncHandler(async (req, res) => {
  const { name, date, optional } = req.body;
  if (!name || !date) throw new ApiError(400, 'Name and date required');
  const holiday = await Holiday.create({ name, date, optional: !!optional });
  res.status(201).json({ success: true, data: holiday });
});

const deleteHoliday = asyncHandler(async (req, res) => {
  await Holiday.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Deleted' });
});

const getCompanySettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  res.json({
    success: true,
    data: {
      ...settings.toObject(),
      r2Configured: isR2Configured(),
    },
  });
});

const updateCompanySettings = asyncHandler(async (req, res) => {
  const allowed = [
    'companyName',
    'timezone',
    'workWeek',
    'defaultCutoff',
    'maxAttachmentSizeMb',
  ];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const settings = await CompanySettings.findOneAndUpdate({ key: 'default' }, update, {
    returnDocument: 'after',
    upsert: true,
  });
  res.json({ success: true, data: settings });
});

const signedUrl = asyncHandler(async (req, res) => {
  const { key } = req.query;
  if (!key) throw new ApiError(400, 'key required');
  const result = await getSignedDownloadUrl(key);
  res.json({ success: true, data: result });
});

const listAudit = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    AuditLog.find()
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(),
  ]);
  res.json({
    success: true,
    data: items,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

const health = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timezone: env.companyTimezone,
      r2Configured: isR2Configured(),
    },
  });
});

module.exports = {
  listHolidays,
  createHoliday,
  deleteHoliday,
  getCompanySettings,
  updateCompanySettings,
  signedUrl,
  listAudit,
  health,
};
