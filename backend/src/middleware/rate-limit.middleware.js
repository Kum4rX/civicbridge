const { sendError } = require('../utils/response');

// In-memory rate limiting map: ip -> Array of timestamps
const requestLog = new Map();

/**
 * Rate limiter middleware for sensitive endpoints like password reset requests.
 * Restricts requests to 5 per IP address per 15-minute window.
 */
const passwordResetLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown-client';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5;

  const timestamps = (requestLog.get(ip) || []).filter((time) => now - time < windowMs);

  if (timestamps.length >= maxRequests) {
    return sendError(
      res,
      429,
      'Too many password reset requests from this IP. Please try again after 15 minutes.'
    );
  }

  timestamps.push(now);
  requestLog.set(ip, timestamps);
  next();
};

/**
 * Helper to reset rate limits (useful for test suites)
 */
const _resetRateLimits = () => {
  requestLog.clear();
};

module.exports = {
  passwordResetLimiter,
  _resetRateLimits
};
