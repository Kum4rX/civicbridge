const { body } = require('express-validator');

const registerValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('role')
    .optional()
    .isIn(['citizen', 'official', 'CITIZEN', 'OFFICIAL'])
    .withMessage('Role must be either citizen or official'),

  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),

  body('location.address')
    .optional()
    .isString()
    .trim()
    .withMessage('Address must be a string'),

  body('location.city')
    .optional()
    .isString()
    .trim()
    .withMessage('City must be a string'),

  body('location.state')
    .optional()
    .isString()
    .trim()
    .withMessage('State must be a string'),

  body('location.pincode')
    .optional()
    .isString()
    .trim()
    .withMessage('Pincode must be a string'),

  body('location.latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate between -90 and 90'),

  body('location.longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate between -180 and 180'),

  body('verification')
    .optional()
    .isObject()
    .withMessage('Verification must be an object'),

  body('verification.documentType')
    .optional()
    .isString()
    .trim()
    .withMessage('Document type must be a string')
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('address')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),

  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty')
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty')
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),

  body('pincode')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{4,10}$/)
    .withMessage('PIN code must be a 4 to 10 digit number'),

  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),

  body('location.address')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),

  body('location.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('location.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),

  body('location.pincode')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{4,10}$/)
    .withMessage('PIN code must be a 4 to 10 digit number')
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match');
      }
      return true;
    })
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

const resetPasswordValidator = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator
};
