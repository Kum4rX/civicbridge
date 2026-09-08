const express = require('express');
const authRoutes = require('./auth.routes');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  return sendSuccess(res, 200, 'Civix API is operational', {
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Petition routes
const petitionRoutes = require('./petition.routes');
router.use('/petitions', petitionRoutes);

module.exports = router;
