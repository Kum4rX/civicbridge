const express = require('express');
const governanceController = require('../controllers/governance.controller');
const {
  localityQueryValidator,
  petitionResponseValidator,
  petitionStatusValidator
} = require('../validators/governance.validator');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = express.Router();

// All governance routes require authentication and OFFICIAL role
router.use(authenticate, authorize('OFFICIAL'));

// Locality petition access
router.get(
  '/petitions',
  localityQueryValidator,
  validate,
  governanceController.getLocalityPetitions
);

// Response and status updates
router.post(
  '/petitions/:id/response',
  petitionResponseValidator,
  validate,
  governanceController.addOfficialResponse
);

router.patch(
  '/petitions/:id/status',
  petitionStatusValidator,
  validate,
  governanceController.updatePetitionStatus
);

module.exports = router;
