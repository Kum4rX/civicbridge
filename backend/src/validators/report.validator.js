const { query } = require('express-validator');

const reportQueryValidator = [
  query('month')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be an integer between 1 and 12'),

  query('year')
    .optional({ checkFalsy: true })
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Year must be a 4-digit year between 2000 and 2100'),

  query('from')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('From date must be a valid ISO date'),

  query('to')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('To date must be a valid ISO date'),

  query('city')
    .optional({ checkFalsy: true })
    .isString()
    .trim(),

  query('state')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
];

const reportExportValidator = [
  ...reportQueryValidator,
  query('format')
    .optional({ checkFalsy: true })
    .toLowerCase()
    .isIn(['csv', 'pdf'])
    .withMessage('Format must be csv or pdf')
];

module.exports = {
  reportQueryValidator,
  reportExportValidator
};
