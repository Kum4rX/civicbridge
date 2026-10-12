const express = require('express');
const router = express.Router();
const {
  getCurrentUser,
  updateProfile,
  changePassword
} = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  updateProfileValidator,
  changePasswordValidator
} = require('../validators/auth.validator');

router.get('/profile', auth, getCurrentUser);
router.put('/profile', auth, updateProfileValidator, validate, updateProfile);
router.patch('/profile', auth, updateProfileValidator, validate, updateProfile);
router.put('/change-password', auth, changePasswordValidator, validate, changePassword);

module.exports = router;
