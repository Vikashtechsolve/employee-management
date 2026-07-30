const Ticket = require('../models/Ticket');
const TicketComment = require('../models/TicketComment');
const User = require('../models/User');
const { uploadFiles } = require('../services/r2Storage');
const { ApiError, asyncHandler } = require('../utils/errors');
const { isAdminLike, isManagerPlus } = require('../middleware/auth');

const createTicket = asyncHandler(async (req, res) => {
  if (!isManagerPlus(req.user)) throw new ApiError(403, 'Not allowed to create tickets');

  const { title, description, priority, assignee, dueDate, department } = req.body;
  if (!title || !description) throw new ApiError(400, 'Title and description required');

  if (req.user.role === 'manager' && assignee) {
    const member = await User.findOne({ _id: assignee, manager: req.user._id });
    if (!member) throw new ApiError(403, 'Can only assign to your team');
  }

  const attachments = await uploadFiles(req.files || [], {
    module: 'tickets',
    userId: req.user._id,
  });

  const ticket = await Ticket.create({
    title,
    description,
    priority: priority || 'medium',
    assignee: assignee || null,
    reporter: req.user._id,
    dueDate: dueDate || null,
    department: department || req.user.department || null,
    attachments,
    activity: [{ by: req.user._id, action: 'created', note: 'Ticket created' }],
  });

  const populated = await Ticket.findById(ticket._id)
    .populate('assignee', 'name employeeId email')
    .populate('reporter', 'name employeeId')
    .populate('department', 'name');

  res.status(201).json({ success: true, data: populated });
});

const listTickets = asyncHandler(async (req, res) => {
  const { status, priority, assignee, overdue, page = 1, limit = 30, scope = 'mine' } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignee = assignee;
  if (overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $nin: ['done', 'cancelled'] };
  }

  if (scope === 'mine' || req.user.role === 'employee') {
    filter.$or = [{ assignee: req.user._id }, { reporter: req.user._id }];
  } else if (req.user.role === 'manager' && !isAdminLike(req.user)) {
    const teamIds = await User.find({ manager: req.user._id }).distinct('_id');
    filter.$or = [
      { assignee: { $in: [...teamIds, req.user._id] } },
      { reporter: req.user._id },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .populate('assignee', 'name employeeId email')
      .populate('reporter', 'name employeeId')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Ticket.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

const getTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('assignee', 'name employeeId email')
    .populate('reporter', 'name employeeId')
    .populate('department', 'name')
    .populate('activity.by', 'name');
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const comments = await TicketComment.find({ ticket: ticket._id })
    .populate('author', 'name employeeId')
    .sort({ createdAt: 1 });

  res.json({ success: true, data: { ticket, comments } });
});

const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const isAssignee = String(ticket.assignee) === String(req.user._id);
  const canManage = isManagerPlus(req.user) || isAssignee;
  if (!canManage) throw new ApiError(403, 'Not allowed');

  const { title, description, priority, status, assignee, dueDate } = req.body;
  const changes = [];

  if (title && isManagerPlus(req.user)) {
    ticket.title = title;
    changes.push('title updated');
  }
  if (description && isManagerPlus(req.user)) ticket.description = description;
  if (priority && isManagerPlus(req.user)) {
    ticket.priority = priority;
    changes.push(`priority → ${priority}`);
  }
  if (status) {
    ticket.status = status;
    changes.push(`status → ${status}`);
  }
  if (assignee !== undefined && isManagerPlus(req.user)) {
    ticket.assignee = assignee || null;
    changes.push('assignee updated');
  }
  if (dueDate !== undefined && isManagerPlus(req.user)) {
    ticket.dueDate = dueDate || null;
  }

  const uploaded = await uploadFiles(req.files || [], {
    module: 'tickets',
    userId: req.user._id,
  });
  if (uploaded.length) {
    ticket.attachments.push(...uploaded);
    changes.push('attachments added');
  }

  ticket.activity.push({
    by: req.user._id,
    action: 'updated',
    note: changes.join(', ') || 'updated',
  });
  await ticket.save();

  const populated = await Ticket.findById(ticket._id)
    .populate('assignee', 'name employeeId email')
    .populate('reporter', 'name employeeId');

  res.json({ success: true, data: populated });
});

const addComment = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const { body } = req.body;
  if (!body) throw new ApiError(400, 'Comment body required');

  const attachments = await uploadFiles(req.files || [], {
    module: 'tickets',
    userId: req.user._id,
  });

  const comment = await TicketComment.create({
    ticket: ticket._id,
    author: req.user._id,
    body,
    attachments,
  });

  ticket.activity.push({ by: req.user._id, action: 'commented', note: body.slice(0, 120) });
  await ticket.save();

  const populated = await TicketComment.findById(comment._id).populate(
    'author',
    'name employeeId'
  );
  res.status(201).json({ success: true, data: populated });
});

module.exports = { createTicket, listTickets, getTicket, updateTicket, addComment };
