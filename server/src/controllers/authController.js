const User = require('../models/User');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/tokens');
const { ApiError, asyncHandler } = require('../utils/errors');
const { normalizeEmail, normalizePassword } = require('../utils/authInput');
const env = require('../config/env');

const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = normalizePassword(req.body.password);
  if (!email || !password) throw new ApiError(400, 'Email and password required');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (!user.isActive) throw new ApiError(403, 'Account is deactivated');

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  const populated = await User.findById(user._id)
    .populate('department', 'name code')
    .populate('manager', 'name email employeeId');

  res.json({
    success: true,
    data: {
      user: populated.toSafeJSON(),
      accessToken,
      refreshToken,
      expiresIn: env.jwtAccessExpires,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'Refresh token required');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const accessToken = signAccessToken(user);
  const newRefresh = signRefreshToken(user);
  user.refreshTokenHash = hashToken(newRefresh);
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    data: { accessToken, refreshToken: newRefresh, expiresIn: env.jwtAccessExpires },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});

const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = normalizePassword(req.body.currentPassword);
  const newPassword = normalizePassword(req.body.newPassword);
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password required');
  }
  if (newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });
  res.json({ success: true, message: 'Logged out' });
});

module.exports = { login, refresh, me, changePassword, logout };
