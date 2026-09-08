const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getCurrentUser } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/me', auth, getCurrentUser);

module.exports = router;