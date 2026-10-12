const express = require('express');
const router = express.Router();
const {
  getCurrentUser,
  updateProfile
} = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  updateProfileValidator
} = require('../validators/auth.validator');

router.get('/profile', auth, getCurrentUser);
router.put('/profile', auth, updateProfileValidator, validate, updateProfile);
router.patch('/profile', auth, updateProfileValidator, validate, updateProfile);

module.exports = router;
