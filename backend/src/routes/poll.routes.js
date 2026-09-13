const express = require('express');
const pollController = require('../controllers/poll.controller');
const {
  createPollValidator,
  pollQueryValidator,
  pollIdValidator,
  votePollValidator,
  updatePollStatusValidator
} = require('../validators/poll.validator');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

// Optional auth middleware for public listing / details to identify user if logged in
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  authenticate(req, res, (err) => {
    // If token invalid, proceed as guest without failing
    next();
  });
};

// Public / optionally authenticated routes
router.get('/', optionalAuth, pollQueryValidator, validate, pollController.getPolls);
router.post('/', authenticate, createPollValidator, validate, pollController.createPoll);

// Specific ID routes
router.get('/:id', optionalAuth, pollIdValidator, validate, pollController.getPollById);
router.post('/:id/vote', authenticate, votePollValidator, validate, pollController.votePoll);
router.get('/:id/results', pollIdValidator, validate, pollController.getPollResults);
router.patch('/:id/status', authenticate, updatePollStatusValidator, validate, pollController.closePoll);

module.exports = router;
