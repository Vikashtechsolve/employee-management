require('dotenv').config();
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const LeaveType = require('../models/LeaveType');
const CompanySettings = require('../models/CompanySettings');
const Holiday = require('../models/Holiday');
const Ticket = require('../models/Ticket');
const { ensureBalances } = require('../services/leaveEngine');
const env = require('../config/env');

async function seed() {
  await connectDB();
  console.log('Seeding database...');

  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    LeaveType.deleteMany({}),
    CompanySettings.deleteMany({}),
    Holiday.deleteMany({}),
    Ticket.deleteMany({}),
  ]);

  await CompanySettings.create({
    key: 'default',
    companyName: 'Acme Workforce',
    timezone: env.companyTimezone,
    workWeek: [1, 2, 3, 4, 5],
    defaultCutoff: env.defaultCutoff,
    maxAttachmentSizeMb: 5,
  });

  const leaveTypes = await LeaveType.insertMany([
    { name: 'Casual Leave', code: 'CL', paid: true, defaultDays: 12 },
    { name: 'Sick Leave', code: 'SL', paid: true, defaultDays: 10, requiresDocument: true },
    { name: 'Earned Leave', code: 'EL', paid: true, defaultDays: 15 },
    { name: 'Unpaid Leave', code: 'UL', paid: false, defaultDays: 30 },
  ]);

  const eng = await Department.create({
    name: 'Engineering',
    code: 'ENG',
    description: 'Product engineering',
  });
  const hrDept = await Department.create({
    name: 'Human Resources',
    code: 'HR',
    description: 'People operations',
  });
  const ops = await Department.create({
    name: 'Operations',
    code: 'OPS',
    description: 'Business operations',
  });

  const year = new Date().getFullYear();
  await Holiday.insertMany([
    { name: 'Republic Day', date: `${year}-01-26` },
    { name: 'Independence Day', date: `${year}-08-15` },
    { name: 'Gandhi Jayanti', date: `${year}-10-02` },
  ]);

  const superAdmin = await User.create({
    employeeId: 'SA001',
    name: 'Super Admin',
    email: env.seedAdminEmail,
    password: env.seedAdminPassword,
    role: 'super_admin',
    designation: 'System Owner',
  });

  const admin = await User.create({
    employeeId: 'AD001',
    name: 'Admin User',
    email: 'admin.user@company.com',
    password: 'Admin@12345',
    role: 'admin',
    designation: 'Administrator',
  });

  const hr = await User.create({
    employeeId: 'HR001',
    name: 'HR Lead',
    email: 'hr@company.com',
    password: 'Hr@123456',
    role: 'hr',
    department: hrDept._id,
    designation: 'HR Manager',
  });

  const manager = await User.create({
    employeeId: 'MG001',
    name: 'Amit Manager',
    email: 'manager@company.com',
    password: 'Manager@123',
    role: 'manager',
    department: eng._id,
    designation: 'Engineering Manager',
    cutoffTime: '10:30',
  });

  eng.head = manager._id;
  await eng.save();

  const employees = [];
  const empData = [
    { employeeId: 'EMP001', name: 'Riya Shah', email: 'riya@company.com' },
    { employeeId: 'EMP002', name: 'Karan Patel', email: 'karan@company.com' },
    { employeeId: 'EMP003', name: 'Neha Desai', email: 'neha@company.com' },
    { employeeId: 'EMP004', name: 'Vikram Joshi', email: 'vikram@company.com' },
    { employeeId: 'EMP005', name: 'Sneha Mehta', email: 'sneha@company.com', dept: ops._id },
  ];

  for (const e of empData) {
    const u = await User.create({
      employeeId: e.employeeId,
      name: e.name,
      email: e.email,
      password: 'Employee@123',
      role: 'employee',
      department: e.dept || eng._id,
      designation: 'Software Engineer',
      manager: manager._id,
      cutoffTime: '11:00',
    });
    employees.push(u);
    await ensureBalances(u._id, year);
  }

  await ensureBalances(manager._id, year);

  await Ticket.create({
    title: 'Prepare monthly attendance report',
    description: 'Compile attendance and work logs for payroll.',
    priority: 'high',
    status: 'open',
    assignee: employees[0]._id,
    reporter: manager._id,
    department: eng._id,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    activity: [{ by: manager._id, action: 'created', note: 'Assigned to Riya' }],
  });

  await Ticket.create({
    title: 'Fix login redirect bug',
    description: 'Users with expired tokens see blank page.',
    priority: 'urgent',
    status: 'in_progress',
    assignee: employees[1]._id,
    reporter: manager._id,
    department: eng._id,
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    activity: [{ by: manager._id, action: 'created', note: 'Bugfix needed' }],
  });

  console.log('Seed complete');
  console.log('--- Login credentials ---');
  console.log(`Super Admin: ${superAdmin.email} / ${env.seedAdminPassword}`);
  console.log('Admin: admin.user@company.com / Admin@12345');
  console.log('HR: hr@company.com / Hr@123456');
  console.log('Manager: manager@company.com / Manager@123');
  console.log('Employee: riya@company.com / Employee@123');
  console.log(`Leave types: ${leaveTypes.length}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
