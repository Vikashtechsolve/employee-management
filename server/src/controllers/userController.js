const User = require('../models/User');
const LeaveBalance = require('../models/LeaveBalance');
const { ensureBalances } = require('../services/leaveEngine');
const { ApiError, asyncHandler } = require('../utils/errors');
const { isAdminLike } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

const listUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    role,
    department,
    isActive,
    managerId,
  } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { employeeId: new RegExp(search, 'i') },
    ];
  }
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (managerId) filter.manager = managerId;

  if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    filter.manager = req.user._id;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('department', 'name code')
      .populate('manager', 'name email employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items.map((u) => u.toSafeJSON()),
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('department', 'name code')
    .populate('manager', 'name email employeeId');
  if (!user) throw new ApiError(404, 'User not found');

  if (
    req.user.role === 'manager' &&
    !isAdminLike(req.user) &&
    String(user.manager?._id || user.manager) !== String(req.user._id) &&
    String(user._id) !== String(req.user._id)
  ) {
    throw new ApiError(403, 'Not allowed to view this employee');
  }

  res.json({ success: true, data: user.toSafeJSON() });
});

const createUser = asyncHandler(async (req, res) => {
  const {
    employeeId,
    name,
    email,
    password,
    role = 'employee',
    department,
    designation,
    phone,
    manager,
    joiningDate,
    cutoffTime,
  } = req.body;

  if (!employeeId || !name || !email || !password) {
    throw new ApiError(400, 'employeeId, name, email, password are required');
  }

  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Only super admin can create super admins');
  }

  const exists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { employeeId }],
  });
  if (exists) throw new ApiError(409, 'Email or employeeId already exists');

  const user = await User.create({
    employeeId,
    name,
    email,
    password,
    role,
    department: department || null,
    designation: designation || '',
    phone: phone || '',
    manager: manager || null,
    joiningDate: joiningDate || Date.now(),
    cutoffTime: cutoffTime || '',
  });

  await ensureBalances(user._id, new Date().getFullYear());

  await AuditLog.create({
    actor: req.user._id,
    action: 'user.create',
    entity: 'User',
    entityId: user._id.toString(),
    meta: { email, role },
  });

  const populated = await User.findById(user._id)
    .populate('department', 'name code')
    .populate('manager', 'name email employeeId');

  res.status(201).json({ success: true, data: populated.toSafeJSON() });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const allowed = [
    'name',
    'department',
    'designation',
    'phone',
    'manager',
    'joiningDate',
    'cutoffTime',
    'isActive',
    'role',
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) user[key] = req.body[key];
  }

  if (req.body.role === 'super_admin' && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Only super admin can assign super_admin');
  }

  if (req.body.password) {
    if (req.body.password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }
    user.password = req.body.password;
  }

  await user.save();

  await AuditLog.create({
    actor: req.user._id,
    action: 'user.update',
    entity: 'User',
    entityId: user._id.toString(),
    meta: req.body,
  });

  const populated = await User.findById(user._id)
    .populate('department', 'name code')
    .populate('manager', 'name email employeeId');

  res.json({ success: true, data: populated.toSafeJSON() });
});

const getTeam = asyncHandler(async (req, res) => {
  const managerId = isAdminLike(req.user) && req.query.managerId
    ? req.query.managerId
    : req.user._id;

  const team = await User.find({ manager: managerId, isActive: true })
    .populate('department', 'name code')
    .sort({ name: 1 });

  res.json({ success: true, data: team.map((u) => u.toSafeJSON()) });
});

const getMyBalances = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  await ensureBalances(req.user._id, year);
  const balances = await LeaveBalance.find({ employee: req.user._id, year }).populate(
    'leaveType',
    'name code paid'
  );
  res.json({
    success: true,
    data: balances.map((b) => ({
      ...b.toObject(),
      remaining: b.allocated - b.used - b.pending,
    })),
  });
});

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  getTeam,
  getMyBalances,
};
