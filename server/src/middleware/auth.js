const User = require('../models/User');
const { verifyAccessToken } = require('../utils/tokens');
const { ApiError } = require('../utils/errors');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentication required');

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub)
      .populate('department', 'name code')
      .populate('manager', 'name email employeeId');
    if (!user || !user.isActive) throw new ApiError(401, 'Invalid or inactive user');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Invalid or expired token'));
    }
    return next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    return next();
  };
}

const ADMIN_ROLES = ['super_admin', 'admin', 'hr'];
const MANAGER_PLUS = ['super_admin', 'admin', 'hr', 'manager'];

function isAdminLike(user) {
  return ADMIN_ROLES.includes(user.role);
}

function isManagerPlus(user) {
  return MANAGER_PLUS.includes(user.role);
}

module.exports = {
  authenticate,
  authorize,
  isAdminLike,
  isManagerPlus,
  ADMIN_ROLES,
  MANAGER_PLUS,
};
