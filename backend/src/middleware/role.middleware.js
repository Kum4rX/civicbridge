const { sendError } = require('../utils/response');

/**
 * Middleware to restrict route access to specific user roles
 * @param  {...string} allowedRoles - List of authorized roles (e.g. 'official', 'citizen')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication is required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

module.exports = authorize;
