const Department = require('../models/Department');
const { ApiError, asyncHandler } = require('../utils/errors');

const listDepartments = asyncHandler(async (req, res) => {
  const items = await Department.find({ isActive: true })
    .populate('head', 'name email')
    .sort({ name: 1 });
  res.json({ success: true, data: items });
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, head } = req.body;
  if (!name || !code) throw new ApiError(400, 'Name and code required');
  const dept = await Department.create({
    name,
    code: code.toUpperCase(),
    description: description || '',
    head: head || null,
  });
  res.status(201).json({ success: true, data: dept });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!dept) throw new ApiError(404, 'Department not found');
  res.json({ success: true, data: dept });
});

module.exports = { listDepartments, createDepartment, updateDepartment };
