const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['super_admin', 'admin', 'hr', 'manager', 'employee'];

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'employee' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    designation: { type: String, default: '' },
    phone: { type: String, default: '' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    joiningDate: { type: Date, default: Date.now },
    cutoffTime: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    employeeId: this.employeeId,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    designation: this.designation,
    phone: this.phone,
    manager: this.manager,
    joiningDate: this.joiningDate,
    cutoffTime: this.cutoffTime,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
