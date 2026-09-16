const { sendError } = require('../utils/response');

/**
 * Middleware to restrict route access to specific user roles
 * @param  {...string} allowedRoles - List of authorized roles (e.g. 'OFFICIAL', 'official')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication is required');
    }

    const userRole = (req.user.role || '').toUpperCase();
    const allowed = allowedRoles.map((r) => (r || '').toUpperCase());

    if (!allowed.includes(userRole)) {
      return sendError(
        res,
        403,
        'Access denied. Requires one of the following roles: ' + allowedRoles.join(', ')
      );
    }

    next();
  };
};

module.exports = authorize;
