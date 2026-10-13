const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

/**
 * Middleware to authenticate JWT token from Authorization header
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Access token required. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production_min_32_characters'
    );

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        code: 'USER_NOT_FOUND',
        message: 'The account associated with this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 'TOKEN_EXPIRED',
        message: 'Session expired. Please log in again.',
      });
    }

    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token.',
    });
  }
};

/**
 * Middleware factory to enforce Role-Based Access Control (RBAC)
 * @param  {...string} roles - Permitted roles (e.g. 'ADMIN', 'RECRUITER')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: `Forbidden: requires one of the following roles: [${roles.join(', ')}]`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
};
