const express = require('express');
const jwt = require('jsonwebtoken');
const reportController = require('../controllers/report.controller');
const User = require('../models/user.model');
const {
  reportQueryValidator,
  reportExportValidator
} = require('../validators/report.validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

// Optional authentication middleware for civic reports transparency
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user) {
      req.user = user.toJSON();
      req.user._id = user._id;
    }
  } catch (err) {
    // Ignore invalid token for public reports
  }
  next();
};

router.use(optionalAuth);

// Summary dashboard metrics
router.get('/summary', reportQueryValidator, validate, reportController.getSummary);

// Petition analytics
router.get('/petitions', reportQueryValidator, validate, reportController.getPetitionStats);

// Poll analytics
router.get('/polls', reportQueryValidator, validate, reportController.getPollStats);

// Public sentiment time-series
router.get('/sentiment', reportQueryValidator, validate, reportController.getSentiment);

// CSV / PDF report export
router.get('/export', reportExportValidator, validate, reportController.exportReport);

module.exports = router;
