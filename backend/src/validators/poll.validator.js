const { body, param, query } = require('express-validator');

const validCategories = [
  'Infrastructure',
  'Environment',
  'Public Safety',
  'Health',
  'Education',
  'Transportation',
  'Sanitation',
  'Governance',
  'Other'
];

const validStatuses = ['active', 'closed'];

const createPollValidator = [
  body('title')
    .custom((val, { req }) => {
      const title = val || req.body.question;
      if (!title || typeof title !== 'string' || title.trim().length < 5) {
        throw new Error('Poll title or question must be at least 5 characters long');
      }
      if (title.trim().length > 300) {
        throw new Error('Poll title or question cannot exceed 300 characters');
      }
      return true;
    }),

  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),

  body('category')
    .optional()
    .trim()
    .isIn(validCategories)
    .withMessage(`Category must be one of: ${validCategories.join(', ')}`),

  body('options')
    .custom((val, { req }) => {
      const options = val || req.body.options;
      if (!options || !Array.isArray(options)) {
        throw new Error('Options must be an array');
      }
      if (options.length < 2) {
        throw new Error('A poll must contain at least 2 options');
      }
      if (options.length > 10) {
        throw new Error('A poll cannot exceed 10 options');
      }

      const texts = [];
      for (const opt of options) {
        const text = typeof opt === 'string' ? opt.trim() : (opt && opt.text ? String(opt.text).trim() : '');
        if (!text || text.length === 0) {
          throw new Error('Each option must have non-empty text');
        }
        if (text.length > 200) {
          throw new Error('Option text cannot exceed 200 characters');
        }
        if (texts.includes(text.toLowerCase())) {
          throw new Error('Poll options must be unique');
        }
        texts.push(text.toLowerCase());
      }
      return true;
    }),

  body('location')
    .custom((val, { req }) => {
      const loc = val || req.body.targetLocation;
      if (!loc || typeof loc !== 'object') {
        throw new Error('Target location is required');
      }
      if (!loc.city || typeof loc.city !== 'string' || !loc.city.trim()) {
        throw new Error('City is required');
      }
      if (!loc.state || typeof loc.state !== 'string' || !loc.state.trim()) {
        throw new Error('State is required');
      }
      return true;
    }),

  body('endDate')
    .optional({ nullable: true })
    .custom((val, { req }) => {
      const endDateVal = val || req.body.closingDate;
      if (!endDateVal) return true;
      const date = new Date(endDateVal);
      if (isNaN(date.getTime())) {
        throw new Error('End date must be a valid ISO date');
      }
      if (date <= new Date()) {
        throw new Error('End date must be in the future');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(validStatuses)
    .withMessage('Status must be either active or closed')
];

const pollQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be an integer greater than or equal to 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),

  query('category')
    .optional()
    .isIn(validCategories)
    .withMessage(`Invalid category filter. Must be one of: ${validCategories.join(', ')}`),

  query('status')
    .optional()
    .isIn(validStatuses)
    .withMessage('Invalid status filter. Must be active or closed'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'totalVotes', 'title', 'endDate'])
    .withMessage('Invalid sortBy field'),

  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc')
];

const pollIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid poll ID format')
];

const votePollValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid poll ID format'),

  body()
    .custom((body) => {
      const optionId = body.optionId || body.selectedOption;
      if (!optionId || (typeof optionId !== 'string' && typeof optionId !== 'object')) {
        throw new Error('Selected option ID is required');
      }
      return true;
    })
];

const updatePollStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid poll ID format'),

  body('status')
    .isIn(validStatuses)
    .withMessage('Status must be either active or closed')
];

module.exports = {
  createPollValidator,
  pollQueryValidator,
  pollIdValidator,
  votePollValidator,
  updatePollStatusValidator,
  validCategories,
  validStatuses
};
