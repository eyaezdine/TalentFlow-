/**
 * Centralized Express Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log full error stack in development
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  // Handle JSON Syntax Error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Malformed JSON payload in request body.',
    });
  }

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    const target = err.meta?.target ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({
      code: 'CONFLICT',
      message: `A record with this ${target} already exists.`,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    });
  }

  // Custom application error with explicit status code
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error occurred.';

  res.status(statusCode).json({
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    code: 'ROUTE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found.`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
