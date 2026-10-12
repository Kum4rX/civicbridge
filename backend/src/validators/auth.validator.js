const { body } = require('express-validator');

const registerValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').trim().notEmpty().isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 }),
  body('role').optional().isIn(['citizen', 'official', 'CITIZEN', 'OFFICIAL']),
  body('location').optional().isObject()
];

const loginValidator = [
  body('email').trim().notEmpty().isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const updateProfileValidator = [
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('address').optional({ nullable: true }).isString().trim().isLength({ max: 200 }),
  body('city').optional().trim().notEmpty().withMessage('City cannot be empty').isLength({ max: 100 }),
  body('state').optional().trim().notEmpty().withMessage('State cannot be empty').isLength({ max: 100 }),
  body('pincode').optional({ nullable: true, checkFalsy: true }).trim().matches(/^\d{4,10}$/).withMessage('PIN code must be a 4 to 10 digit number'),
  body('location').optional().isObject()
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator
};
