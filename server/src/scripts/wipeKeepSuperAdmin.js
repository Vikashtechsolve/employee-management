require('dotenv').config();
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const WorkLog = require('../models/WorkLog');
const Ticket = require('../models/Ticket');
const TicketComment = require('../models/TicketComment');
const Holiday = require('../models/Holiday');
const CompanySettings = require('../models/CompanySettings');
const AuditLog = require('../models/AuditLog');

async function wipe() {
  await connectDB();
  console.log('Wiping database (keeping super_admin users)...');

  const kept = await User.find({ role: 'super_admin' }).select('email employeeId name');
  if (!kept.length) {
    console.warn('Warning: no super_admin users found. Aborting to avoid locking you out.');
    process.exit(1);
  }

  console.log('Keeping:');
  kept.forEach((u) => console.log(`  - ${u.email} (${u.employeeId})`));

  const [
    users,
    departments,
    leaveTypes,
    leaveBalances,
    leaveRequests,
    attendance,
    workLogs,
    tickets,
    ticketComments,
    holidays,
    settings,
    auditLogs,
  ] = await Promise.all([
    User.deleteMany({ role: { $ne: 'super_admin' } }),
    Department.deleteMany({}),
    LeaveType.deleteMany({}),
    LeaveBalance.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Attendance.deleteMany({}),
    WorkLog.deleteMany({}),
    Ticket.deleteMany({}),
    TicketComment.deleteMany({}),
    Holiday.deleteMany({}),
    CompanySettings.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  await User.updateMany(
    { role: 'super_admin' },
    { $set: { department: null, manager: null, refreshTokenHash: null } }
  );

  console.log('Deleted:');
  console.log(`  users (non super_admin): ${users.deletedCount}`);
  console.log(`  departments: ${departments.deletedCount}`);
  console.log(`  leaveTypes: ${leaveTypes.deletedCount}`);
  console.log(`  leaveBalances: ${leaveBalances.deletedCount}`);
  console.log(`  leaveRequests: ${leaveRequests.deletedCount}`);
  console.log(`  attendance: ${attendance.deletedCount}`);
  console.log(`  workLogs: ${workLogs.deletedCount}`);
  console.log(`  tickets: ${tickets.deletedCount}`);
  console.log(`  ticketComments: ${ticketComments.deletedCount}`);
  console.log(`  holidays: ${holidays.deletedCount}`);
  console.log(`  companySettings: ${settings.deletedCount}`);
  console.log(`  auditLogs: ${auditLogs.deletedCount}`);
  console.log('Done.');
  process.exit(0);
}

wipe().catch((err) => {
  console.error(err);
  process.exit(1);
});
