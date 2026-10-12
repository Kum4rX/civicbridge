const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
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
  forgotPasswordValidator
} = require('../validators/auth.validator');

router.post('/register', registerValidator, validate, registerUser);
router.post('/login', loginValidator, validate, loginUser);
router.get('/smtp-status', getSmtpStatus);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidator, validate, forgotPassword);
router.get('/me', auth, getCurrentUser);
router.put('/profile', auth, updateProfileValidator, validate, updateProfile);
router.put('/change-password', auth, changePasswordValidator, validate, changePassword);

module.exports = router;
