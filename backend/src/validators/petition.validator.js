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

const validStatuses = ['draft', 'active', 'under_review', 'closed', 'flagged'];

const createPetitionValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 150 })
    .withMessage('Title must be between 5 and 150 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20 and 5000 characters'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(validCategories)
    .withMessage(`Category must be one of: ${validCategories.join(', ')}`),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),

  body('tags.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each tag must be a string'),

  body('targetSignatures')
    .optional()
    .isInt({ min: 10, max: 1000000 })
    .withMessage('Target signatures must be an integer between 10 and 1,000,000'),

  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isObject()
    .withMessage('Location must be an object'),

  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('location.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),

  body('location.address')
    .optional()
    .isString()
    .trim()
    .withMessage('Address must be a string'),

  body('location.pincode')
    .optional()
    .isString()
    .trim()
    .withMessage('Pincode must be a string'),

  body('location.latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('status')
    .optional()
    .isIn(['draft', 'active'])
    .withMessage('Initial status must be either draft or active')
];

const updatePetitionValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid petition ID format'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 150 })
    .withMessage('Title must be between 5 and 150 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20 and 5000 characters'),

  body('category')
    .optional()
    .trim()
    .isIn(validCategories)
    .withMessage(`Category must be one of: ${validCategories.join(', ')}`),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),

  body('tags.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each tag must be a string'),

  body('targetSignatures')
    .optional()
    .isInt({ min: 10, max: 1000000 })
    .withMessage('Target signatures must be an integer between 10 and 1,000,000'),

  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),

  body('location.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty if provided'),

  body('location.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty if provided'),

  body('location.address')
    .optional()
    .isString()
    .trim(),

  body('location.pincode')
    .optional()
    .isString()
    .trim(),

  body('location.latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('status')
    .optional()
    .isIn(validStatuses)
    .withMessage(`Status must be one of: ${validStatuses.join(', ')}`)
];

const petitionQueryValidator = [
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
    .withMessage(`Invalid status filter. Must be one of: ${validStatuses.join(', ')}`),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'signaturesCount', 'targetSignatures', 'title'])
    .withMessage('Invalid sortBy field'),

  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc')
];

const petitionIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid petition ID format')
];

module.exports = {
  createPetitionValidator,
  updatePetitionValidator,
  petitionQueryValidator,
  petitionIdValidator,
  validCategories,
  validStatuses
};
