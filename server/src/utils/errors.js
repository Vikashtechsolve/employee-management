class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function errorHandler(err, req, res, next) {
  // Multer wraps filter/limit failures
  if (err?.name === 'MulterError') {
    const status = 400;
    return res.status(status).json({
      success: false,
      message:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large'
          : err.message || 'Upload failed',
    });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err.message);
  }
  const payload = {
    success: false,
    message: err.message || 'Internal server error',
  };
  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== 'production' && status === 500) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}

module.exports = { ApiError, asyncHandler, errorHandler };
