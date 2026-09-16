const express = require('express');
const petitionController = require('../controllers/petition.controller');
const {
  createPetitionValidator,
  updatePetitionValidator,
  petitionQueryValidator,
  petitionIdValidator
} = require('../validators/petition.validator');
const {
  petitionResponseValidator,
  petitionStatusValidator
} = require('../validators/governance.validator');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = express.Router();

// Public routes
router.get('/', petitionQueryValidator, validate, petitionController.getPetitions);

// Protected routes (Specific routes before parameter routes)
router.get('/my', authenticate, petitionQueryValidator, validate, petitionController.getMyPetitions);
router.get('/signed', authenticate, petitionQueryValidator, validate, petitionController.getSignedPetitions);
router.post('/', authenticate, createPetitionValidator, validate, petitionController.createPetition);

// Single petition routes
router.get('/:id', petitionIdValidator, validate, petitionController.getPetitionById);
router.put('/:id', authenticate, updatePetitionValidator, validate, petitionController.updatePetition);
router.delete('/:id', authenticate, petitionIdValidator, validate, petitionController.deletePetition);

// Milestone 4: Signing & Official governance response routes
router.post('/:id/sign', authenticate, petitionIdValidator, validate, petitionController.signPetition);
router.post(
  '/:id/response',
  authenticate,
  authorize('OFFICIAL'),
  petitionResponseValidator,
  validate,
  petitionController.addResponse
);
router.patch(
  '/:id/status',
  authenticate,
  authorize('OFFICIAL'),
  petitionStatusValidator,
  validate,
  petitionController.updateStatus
);

module.exports = router;
