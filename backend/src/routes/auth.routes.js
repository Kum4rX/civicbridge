const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getSmtpStatus
} = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { passwordResetLimiter } = require('../middleware/rate-limit.middleware');
const {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../validators/auth.validator');

// Public routes
router.post('/register', registerValidator, validate, registerUser);
router.post('/login', loginValidator, validate, loginUser);

// SMTP configuration status check (safe, no secrets exposed)
router.get('/smtp-status', getSmtpStatus);

// Password recovery routes
router.post(
  '/forgot-password',
  passwordResetLimiter,
  forgotPasswordValidator,
  validate,
  forgotPassword
);

router.post(
  '/reset-password',
  resetPasswordValidator,
  validate,
  resetPassword
);

// Protected routes (require valid JWT)
router.get('/me', auth, getCurrentUser);
router.put('/profile', auth, updateProfileValidator, validate, updateProfile);
router.put('/change-password', auth, changePasswordValidator, validate, changePassword);

module.exports = router;
