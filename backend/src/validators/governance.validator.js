const { body, param, query } = require('express-validator');

const validStatuses = ['active', 'under_review', 'closed'];

const petitionResponseValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid petition ID format'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Response message is required')
    .isLength({ min: 5, max: 5000 })
    .withMessage('Response message must be between 5 and 5000 characters'),

  body('status')
    .optional({ checkFalsy: true })
    .customSanitizer((v) => (v ? v.toLowerCase() : v))
    .isIn(['draft', 'active', 'under_review', 'closed', 'flagged'])
    .withMessage('Invalid status')
];

const petitionStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid petition ID format'),

  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .customSanitizer((v) => (v ? v.toLowerCase() : v))
    .isIn(validStatuses)
    .withMessage('Status must be one of: active, under_review, closed')
];

const localityQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .customSanitizer((v) => (v ? v.toLowerCase() : v))
    .isIn(['', 'draft', 'active', 'under_review', 'closed', 'flagged'])
    .withMessage('Invalid status filter')
];

module.exports = {
  petitionResponseValidator,
  petitionStatusValidator,
  localityQueryValidator
};
