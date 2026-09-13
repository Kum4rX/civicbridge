const pollService = require('../services/poll.service');
const { sendSuccess } = require('../utils/response');

class PollController {
  /**
   * Create a new poll
   */
  async createPoll(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const poll = await pollService.create(userId, req.body);
      return sendSuccess(res, 201, 'Poll created successfully', { poll });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all polls with filtering and pagination
   */
  async getPolls(req, res, next) {
    try {
      const currentUserId = req.user ? (req.user._id || req.user.id) : null;
      const result = await pollService.findAll(req.query, currentUserId);
      return sendSuccess(res, 200, 'Polls retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single poll by ID
   */
  async getPollById(req, res, next) {
    try {
      const currentUserId = req.user ? (req.user._id || req.user.id) : null;
      const poll = await pollService.findById(req.params.id, currentUserId);
      return sendSuccess(res, 200, 'Poll retrieved successfully', { poll });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cast vote on a poll
   */
  async votePoll(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const optionId = req.body.optionId || req.body.selectedOption;
      const result = await pollService.vote(req.params.id, userId, optionId);
      return sendSuccess(res, 200, 'Vote recorded successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get live results and sentiment analytics for a poll
   */
  async getPollResults(req, res, next) {
    try {
      const results = await pollService.getResults(req.params.id);
      return sendSuccess(res, 200, 'Poll results retrieved successfully', results);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update poll status (e.g. close poll)
   */
  async closePoll(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      const status = req.body.status || 'closed';
      const poll = await pollService.updateStatus(req.params.id, userId, userRole, status);
      return sendSuccess(res, 200, `Poll status updated to ${status} successfully`, { poll });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PollController();
